describe("Dashboard", () => {
   /**
    * 1. Visitar /dashboard. El elemento #titulo-dashboard debe contener el texto "Dashboard -
       SkyRoute" y la tarjeta #stat-vuelos debe mostrar un valor numérico mayor que cero.
    */
   it("should display dashboard title and flight statistics", () => {
      cy.visit("/dashboard")

      cy.get("#titulo-dashboard").should("contain", "Dashboard - SkyRoute")
      cy.get("#stat-vuelos span.stat-value")
         .invoke("text")
         .then((text) => {
            const value = parseInt(text, 10)
            expect(value).to.be.greaterThan(0)
         })
   })
   /**
    * 2. Visitar /dashboard, hacer clic en #link-buscar. La URL resultante debe terminar en
       /buscar y el input #input-origen debe ser visible y estar habilitado.
    */
   it("should navigate to search page when clicking buscar link", () => {
      cy.visit("/dashboard")
      cy.get("#link-buscar").click()
      cy.location("pathname").should("equal", "/buscar")
      cy.get("#input-origen").should("be.visible").and("be.enabled")
   })
   /**
    * 3. Visitar /dashboard, hacer clic en #link-reservas. La URL debe terminar en /reservas y el
       título de la pantalla debe ser "Historial de Reservas".

    */
   it("should navigate to reservations page when clicking reservas link", () => {
      cy.visit("/dashboard")
      cy.get("#link-reservas").click()
      cy.location("pathname").should("equal", "/reservas")
      cy.get("#titulo-historial").should("contain", "Historial de Reservas")
   })
   /**
    * 4. Visitar /ruta-que-no-existe. La aplicación debe redirigir a /dashboard (la ruta comodín del
       enrutador está configurada así). La aserción se hace sobre cy.url(); no se debe esperar
       una página 404 dedicada.
    */
   it("should redirect non-existent routes to dashboard", () => {
      cy.visit("/ruta-que-no-existe")
      cy.url().should("equal", "http://localhost:4200/dashboard")
   })
})