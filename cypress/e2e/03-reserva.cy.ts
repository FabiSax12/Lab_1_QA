describe("Flujo de reserva", () => {
    const fechaTest = new Date("2026-04-14T12:00:00");

    beforeEach(() => {
        cy.clock(fechaTest.getTime());
        cy.visit("/dashboard");
    });

    afterEach(() => {
        cy.clock().then((clock) => clock.restore());
    });

    const navigateToReservas = () => {
        cy.get("#link-reservas").click()
        cy.url().should("include", "/reservas")
    }

    /**
     * 1. Camino feliz: con cy.clock fijado a 2026-04-14, navegar de búsqueda a reserva del SR1001, seleccionar al pasajero #1 (Carlos), confirmar. La pantalla debe mostrar el código
        de reserva con formato /^SKY-[A-Z0-9]{6}$/ y el estado "pendiente". Verificar también
        que la reserva aparece luego en /reservas.
     */
    it("1 - Camino feliz: reserva SR1001 con pasajero Carlos y verificación en historial", () => {
        cy.visit("buscar")
        cy.get("#btn-todos").click()
        cy.get("#vuelo-card-1").find("#btn-reservar-1").click()

        cy.url().should("equal", "http://localhost:4200/reservar/1");

        cy.get("#vuelo-info").should("contain.text", "SR-1001");
        cy.get("#pasajero-1").click();

        cy.get("#btn-confirmar-reserva").should("contain.text", "Confirmar Reserva").click();

        cy.get("#resultado-reserva.exito").should("be.visible");
        cy.get("#codigo-reserva")
            .first()
            .invoke("text")
            .then((codigo) => {
                expect(codigo.trim()).to.match(/^SKY-[A-Z0-9]{6}$/);
                cy.wrap(codigo.trim()).as("assignedId")
            });
        cy.get("#resultado-reserva .resultado-exito").should("contain.text", "pendiente");

        navigateToReservas()

        cy.get("#titulo-historial").should("be.visible");
        cy.get('[id^="reserva-panel-"]').should("have.length.at.least", 1);
        cy.get("@assignedId").then((assignedId) => {
            cy.get('[id^="reserva-panel-"]').contains("span", String(assignedId)).should("be.visible")
        })
    });

    /**
     * 2. Botón deshabilitado: en /reservar/1 sin seleccionar pasajeros, #btn-confirmar debe tener
        el atributo disabled.
     */
    it("2 - Botón deshabilitado sin pasajeros seleccionados", () => {
        cy.visit("/reservar/1");

        cy.contains("button", "Confirmar Reserva").should("be.disabled");
    });

    /**
     * 3. Reserva con dos pasajeros: seleccionar pasajeros #1 (adulto) y #2 (niño), reservar SR1001 con la opción seguroViaje activada. El precio total mostrado debe ser mayor que
        el doble del precio base del vuelo (porque se sumaron impuestos y opciones) y la
        reserva debe aparecer en /reservas con dos pasajeros listados.
     */
    it("3 - Reserva con dos pasajeros y seguro de viaje", () => {
        cy.visit("/reservar/1");

        cy.get(".pasajero-item").eq(0).click();
        cy.get(".pasajero-item").eq(1).click();
        cy.get("#opcion-seguroViaje").click();

        cy.contains("button", "Confirmar Reserva").click();

        cy.get(".resultado-card.exito").should("be.visible");
        cy.get(".precio-row.total span")
            .eq(1)
            .invoke("text")
            .then((totalText) => {
                const total = parseInt(totalText.replace(/[^0-9]/g, ""), 10);
                const dobleBase = 450 * 2;
                expect(total).to.be.greaterThan(dobleBase);
            });

        cy.get("#link-reservas").click()
        cy.url().should("include", "/reservas")

        cy.get(".reserva-panel").first().click();
        cy.get(".pasajero-line").should("have.length", 2);
    });

    /**
     * 4. Infante con adulto: seleccionar pasajeros #1 (Carlos, adulto) y #4 (Sofía, infante) sobre
        SR-1004 (San José → Bogotá, país destino CO). Carlos y Sofía aprueban la verificación
        de documentos porque CR→CO y MX→CO entran por libre tránsito latinoamericano
        (regla implementada en PasajeroService.verificarDocumentos: paisesLatam incluye CR
        y MX, destinosLibresLatam incluye CO). La regla del adulto por infante se cumple con
        un adulto y un infante. La reserva debe crearse y el código SKY-XXXXXX debe quedar
        visible.
     */
    it("4 - Infante con adulto: reserva válida SR1004 Carlos + Sofía", () => {
        cy.visit("/reservar/4");

        cy.get(".pasajero-item").eq(0).click();
        cy.get(".pasajero-item").eq(3).click();

        cy.contains("button", "Confirmar Reserva").click();

        cy.get(".resultado-card.exito").should("be.visible");
        cy.get(".resultado-exito strong")
            .first()
            .invoke("text")
            .then((codigo) => {
                expect(codigo.trim()).to.match(/^SKY-[A-Z0-9]{6}$/);
            });
    });

    /**
     * 5. Infante sin adulto: seleccionar únicamente al pasajero #4 (Sofía, infante) sobre SR-1004.
        Sofía aprueba documentos por libre tránsito MX→CO, así que la validación que corta el
        flujo es la de adulto/infante. El #msg-error debe contener el texto "al menos 1 adulto por
        cada infante". Si se eligiera un destino donde Sofía requiera visa (por ejemplo SR-1001
        a US), el error sería "Documentos insuficientes" y la prueba estaría midiendo otra regla;
        por eso se usa SR-1004.
     */
    it("5 - Infante sin adulto: error de validación en SR1004", () => {
        cy.visit("/reservar/4");

        cy.get(".pasajero-item").eq(3).click();

        cy.contains("button", "Confirmar Reserva").click();

        cy.get(".resultado-card.error").should("be.visible");
        cy.get("#msg-error").should(
            "contain.text",
            "al menos 1 adulto por cada infante"
        );
    });

    /**
     * 6. Vuelo cancelado: visitar directamente /reservar/5 (SR-1005 cancelado). El detalle del
        vuelo se renderiza igual y el formulario queda activo, porque ReservaComponent no
        consulta el estado en ngOnInit; la validación se evalúa dentro de
        ReservaService.crearReserva al confirmar. La prueba debe seleccionar a Carlos, hacer
        clic en confirmar y aserar que #msg-error contiene "no está disponible". Capturar ese
        error es lo que se considera éxito; no se acepta otro resultado.
     */
    it("6 - Vuelo cancelado: error al reservar SR1005", () => {
        cy.visit("/reservar/5");

        cy.get(".vuelo-info-card").should("be.visible");
        cy.get(".pasajero-item").first().click();

        cy.contains("button", "Confirmar Reserva").click();

        cy.get(".resultado-card.error").should("be.visible");
        cy.get("#msg-error").should("contain.text", "no está disponible");
    });

    /**
     * 7. Vuelo inexistente: visitar /reservar/9999. La pantalla debe mostrar "Vuelo no
        encontrado." y un botón que regresa a /buscar; el formulario de selección de pasajeros
        NO debe renderizarse.
     */
    it("7 - Vuelo inexistente: mensaje de error y botón de regreso", () => {
        cy.visit("/reservar/9999");

        cy.get(".no-vuelo").should("be.visible");
        cy.get(".no-vuelo p").should("contain.text", "Vuelo no encontrado.");
        cy.get(".no-vuelo a[routerlink='/buscar']").should("be.visible");

        cy.get(".pasajero-item").should("not.exist");
    });
});
