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
        cy.get("#sidebar-link-reservas").click()
        cy.url().should("include", "/reservas")
    }

    // Caso: 1
    // Objetivo: Verificar el camino feliz de una reserva completa, desde búsqueda hasta confirmación y aparición en historial.
    // Datos de entrada: Vuelo SR1001, pasajero #1 (Carlos), sin opciones adicionales.
    // Resultado esperado: Código con formato SKY-XXXXXX, estado "pendiente", reserva visible en /reservas.
    it("1 - Camino feliz: reserva SR1001 con pasajero Carlos y verificación en historial", () => {
        cy.visit("/buscar")
        cy.get("#btn-todos").click()
        cy.get("#vuelo-card-1").find("#btn-reservar-1").click()

        cy.url().should("equal", "http://localhost:4200/reservar/1");

        cy.get("#vuelo-info").should("contain.text", "SR-1001");
        cy.get("#pasajero-1").click();

        cy.get("#btn-confirmar").should("contain.text", "Confirmar Reserva").click();

        cy.get("#resultado-reserva").should("be.visible");
        cy.get("#resultado-reserva").should("have.class", "exito");
        cy.get("#codigo-reserva")
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
            cy.get('[id^="reserva-panel-"]').first().within(() => {
                cy.get(".reserva-codigo").should("contain.text", String(assignedId))
            })
        })
        cy.get('[id^="reserva-panel-"]').first().within(() => {
            cy.get("mat-panel-description").should("contain.text", "PENDIENTE")
        })
    });

    // Caso: 2
    // Objetivo: Verificar que el botón de confirmar está deshabilitado cuando no hay pasajeros seleccionados.
    // Datos de entrada: Ninguno (visitar /reservar/1 sin interactuar).
    // Resultado esperado: #btn-confirmar tiene el atributo disabled.
    it("2 - Botón deshabilitado sin pasajeros seleccionados", () => {
        cy.visit("/reservar/1");

        cy.get("#btn-confirmar").should("be.disabled");
    });

    // Caso: 3
    // Objetivo: Verificar reserva con dos pasajeros y seguro de viaje, comprobando precio total y aparición en historial.
    // Datos de entrada: Vuelo SR1001, pasajeros #1 (adulto) y #2 (niño), seguroViaje activado.
    // Resultado esperado: Precio total > doble del precio base, código de reserva visible, 2 pasajeros en historial.
    it("3 - Reserva con dos pasajeros y seguro de viaje", () => {
        cy.visit("/reservar/1");

        cy.get("#pasajero-1").click();
        cy.get("#pasajero-2").click();
        cy.get("#opcion-seguroViaje").click();

        cy.get("#btn-confirmar").click();

        cy.get("#resultado-reserva").should("be.visible");
        cy.get("#resultado-reserva").should("have.class", "exito");
        cy.get("#codigo-reserva").invoke("text").then((codigo) => {
            expect(codigo.trim()).to.match(/^SKY-[A-Z0-9]{6}$/);
        });

        cy.get("#precio-total")
            .invoke("text")
            .then((totalText) => {
                const total = parseInt(totalText.replace(/[^0-9]/g, ""), 10);
                const dobleBase = 450 * 2;
                expect(total).to.be.greaterThan(dobleBase);
            });

        navigateToReservas()

        cy.get('[id^="reserva-panel-"]').first().click();
        cy.get(".pasajero-line").should("have.length", 2);
    });

    // Caso: 4
    // Objetivo: Verificar que un infante puede reservarse junto con un adulto cumpliendo la regla de adulto/infante.
    // Datos de entrada: Vuelo SR1004 (San José → Bogotá), pasajero #1 (Carlos, adulto) y #4 (Sofía, infante).
    // Resultado esperado: Reserva creada exitosamente, código SKY-XXXXXX visible.
    it("4 - Infante con adulto: reserva válida SR1004 Carlos + Sofía", () => {
        cy.visit("/reservar/4");

        cy.get("#pasajero-1").click();
        cy.get("#pasajero-4").click();

        cy.get("#btn-confirmar").click();

        cy.get("#resultado-reserva").should("be.visible");
        cy.get("#resultado-reserva").should("have.class", "exito");
        cy.get("#codigo-reserva")
            .invoke("text")
            .then((codigo) => {
                expect(codigo.trim()).to.match(/^SKY-[A-Z0-9]{6}$/);
            });
    });

    // Caso: 5
    // Objetivo: Verificar que no se puede reservar un infante sin un adulto acompañante.
    // Datos de entrada: Vuelo SR1004, únicamente pasajero #4 (Sofía, infante).
    // Resultado esperado: Error visible con mensaje "al menos 1 adulto por cada infante".
    it("5 - Infante sin adulto: error de validación en SR1004", () => {
        cy.visit("/reservar/4");

        cy.get("#pasajero-4").click();

        cy.get("#btn-confirmar").click();

        cy.get("#resultado-reserva").should("be.visible");
        cy.get("#resultado-reserva").should("have.class", "error");
        cy.get("#msg-error").should(
            "contain.text",
            "al menos 1 adulto por cada infante"
        );
    });

    // Caso: 6
    // Objetivo: Verificar que no se puede reservar un vuelo cancelado.
    // Datos de entrada: Vuelo SR1005 (cancelado), pasajero #1 (Carlos).
    // Resultado esperado: Error visible con mensaje "no está disponible".
    it("6 - Vuelo cancelado: error al reservar SR1005", () => {
        cy.visit("/reservar/5");

        cy.get("#vuelo-info").should("be.visible");
        cy.get("#pasajero-1").click();

        cy.get("#btn-confirmar").click();

        cy.get("#resultado-reserva").should("be.visible");
        cy.get("#resultado-reserva").should("have.class", "error");
        cy.get("#msg-error").should("contain.text", "no está disponible");
    });

    // Caso: 7
    // Objetivo: Verificar que se muestra mensaje de error al intentar reservar un vuelo inexistente.
    // Datos de entrada: ID de vuelo 9999 (inexistente).
    // Resultado esperado: Mensaje "Vuelo no encontrado.", botón de regreso visible, formulario de pasajeros no renderizado.
    it("7 - Vuelo inexistente: mensaje de error y botón de regreso", () => {
        cy.visit("/reservar/9999");

        cy.get(".no-vuelo").should("be.visible");
        cy.get(".no-vuelo p").should("contain.text", "Vuelo no encontrado.");
        cy.get(".no-vuelo a[routerlink='/buscar']").should("be.visible");

        cy.get(".pasajero-item").should("not.exist");
    });
});
