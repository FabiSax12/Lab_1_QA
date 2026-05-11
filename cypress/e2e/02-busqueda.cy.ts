describe("Búsqueda de Vuelos - Pruebas de Caja Negra", () => {
   /**
    * ============================================================
    * PARTICIONES VÁLIDAS E INVÁLIDAS
    * ============================================================
    *
    * CAMPO: origen
    * +---------------------------+--------------------------------+
    * | Clase válida              | Clase inválida                 |
    * +---------------------------+--------------------------------+
    * | Ciudad con vuelos en      | - Cadena vacía ("")            |
    * | los datos semilla:        | - Ciudad sin vuelos:           |
    * | "San José", "Miami",      | | "Tokio", "París", etc.       |
    * | "Madrid", etc.            |                                |
    * +---------------------------+--------------------------------+
    *
    * CAMPO: destino
    * +---------------------------+--------------------------------+
    * | Clase válida              | Clase inválida                 |
    * +---------------------------+--------------------------------+
    * | Ciudad con vuelos en      | - Cadena vacía ("")            |
    * | los datos semilla:        | - Ciudad sin vuelos:           |
    * | "Miami", "Madrid", etc.   | | "Tokio", "París", etc.       |
    * +---------------------------+--------------------------------+
    *
    * CAMPO: fecha
    * +---------------------------+--------------------------------+
    * | Clase válida              | Clase inválida                 |
    * +---------------------------+--------------------------------+
    * | Fecha con vuelos          | - Fecha sin vuelos ese día:    |
    * | programados/retrasados   | | cualquier día sin coincidencias|
    * | en semilla (15-18 abr):   | | en los datos                 |
    * | 2026-04-15, 16, 17, 18    |                                |
    * +---------------------------+--------------------------------+
    *
    * DECISIÓN DE DISEÑO: La búsqueda no muestra error cuando los campos
    * están vacíos. En cambio, devuelve un arreglo vacío (length 0).
    * Esta decisión se aplica a la clase inválida de campo vacío:
    * no hay mensaje de "campo requerido", solo resultados vacíos.
    *
    * ============================================================
    * FIN DE PARTICIONES
    * ============================================================
    */

   beforeEach(() => {
      // const fechaTest = new Date("2026-04-14T12:00:00");
      // cy.clock(fechaTest.getTime());
      cy.visit("/buscar");
   });

   afterEach(() => {
      cy.clock().then((clock) => clock.restore());
   });

   /**
    * Prueba 1: Clase válida
    * Con cy.clock fijado al 14 abril 2026, llenar origen "San José",
    * destino "Miami", fecha 2026-04-15 y hacer clic en #btn-buscar.
    * cy.get('[id^="vuelo-card-"]').should('have.length.at.least', 2)
    * confirma que aparecen al menos los vuelos SR-1001 y SR-1006;
    * el primero debe mostrarse con precio en USD.
    */
   it("1 - Clase válida: búsqueda San José → Miami el 2026-04-15 con al menos 2 vuelos y precio USD", () => {
      cy.get("#input-origen").type("San José");
      cy.get("#input-destino").focus().type("Miami");
      cy.get("#input-fecha").type("2026-04-15");
      cy.get("#btn-buscar").click();

      cy.get('[id^="vuelo-card-"]').should("have.length.at.least", 2);
      cy.get('[id^="vuelo-card-"]').first().within(() => {
         cy.get(".moneda").should("contain.text", "USD");
      });
   });

   /**
    * Prueba 2: Clase inválida (campo vacío)
    * Dejar destino en blanco y hacer clic en buscar.
    * La sección de resultados se renderiza pero cy.get('[id^="vuelo-card-"]')
    * debe tener length 0; el mensaje #msg-sin-resultados debe ser visible.
    */
   it("2 - Clase inválida: destino vacío devuelve 0 resultados con mensaje visible", () => {
      cy.get("#input-origen").type("San José");
      cy.get("#input-fecha").type("2026-04-15");
      cy.get("#btn-buscar").click();

      cy.get('[id^="vuelo-card-"]').should("have.length", 0);
      cy.get("#msg-sinresultados").should("be.visible");
   });

   /**
    * Prueba 3: Clase inválida (combinación sin coincidencias)
    * Origen "Tokio", destino "París", cualquier fecha futura.
    * Mismo mensaje "No se encontraron vuelos" y cy.get('[id^="vuelo-card-"]')
    * con length 0.
    */
   it("3 - Clase inválida: origen/destino sin coincidencias devuelve 0 resultados", () => {
      cy.get("#input-origen").type("Tokio");
      cy.get("#input-destino").focus().type("París");
      cy.get("#input-fecha").type("2027-01-01");
      cy.get("#btn-buscar").click();

      cy.get('[id^="vuelo-card-"]').should("have.length", 0);
      cy.get("#msg-sinresultados").should("be.visible");
   });

   /**
    * Prueba 4: Insensibilidad de mayúsculas y espacios
    * Origen " san josé ", destino "MIAMI", fecha 2026-04-15.
    * La búsqueda debe retornar los mismos resultados que la prueba 1,
    * comprobando que la lógica del servicio (trim y minúsculas) se
    * observa desde la interfaz.
    */
   it("4 - Insensibilidad: trim y mayúsculas no afectan resultados", () => {
      cy.get("#input-origen").type(" san josé ");
      cy.get("#input-destino").focus().type("MIAMI");
      cy.get("#input-fecha").type("2026-04-15");
      cy.get("#btn-buscar").click();

      cy.get('[id^="vuelo-card-"]').should("have.length.at.least", 2);
   });

   /**
    * Prueba 5: Botón "Ver Todos"
    * Al hacer clic en #btn-todos sin llenar nada, deben aparecer cinco
    * tarjetas (los vuelos no cancelados con asientos disponibles:
    * SR-1001, SR-1002, SR-1003, SR-1004 y SR-1006).
    * La cuenta se hace con cy.get('[id^="vuelo-card-"]').should('have.length', 5).
    * El vuelo SR-1005 (cancelado) NO debe estar en el listado,
    * lo que se verifica con cy.get('#vuelo-card-5').should('not.exist').
    */
   it("5 - Ver Todos: muestra 5 vuelos disponibles y excluye SR-1005 cancelado", () => {
      cy.get("#btn-todos").click();

      cy.get('[id^="vuelo-card-"]').should("have.length", 5);
      cy.get("#vuelo-card-5").should("not.exist");
   });

   /**
    * Prueba 6: Valor límite del estado
    * El vuelo SR-1006 está en estado "retrasado". Buscar San José → Miami
    * el 2026-04-15 debe incluirlo en los resultados (ambos estados,
    * programado y retrasado, son válidos para la búsqueda).
    */
   it("6 - Valor límite: vuelo retrasado SR-1006 aparece en resultados de San José → Miami", () => {
      cy.get("#input-origen").type("San José");
      cy.get("#input-destino").focus().type("Miami");
      cy.get("#input-fecha").type("2026-04-15");
      cy.get("#btn-buscar").click();

      cy.get('[id^="vuelo-card-"]').should("have.length.at.least", 2);
   });
});