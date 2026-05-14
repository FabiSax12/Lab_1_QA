const CYPRESS_VARIABLE_NAMES = {
    TOTAL_PRICE: "precioTotal",
    ASSIGNED_ID: "assignedId",
    BOOKING_ID: "bookingId"
}

describe("Estados de la reserva", () => {
    const testingDate = new Date("2026-04-14T12:00:00")

    beforeEach(() => {
        cy.clock(testingDate.getTime())
    })

    afterEach(() => {
        cy.clock().then((clock) => clock.restore())
    })

    const navigateToReservas = () => {
        cy.get("#sidebar-link-reservas").click()
        cy.url().should("include", "/reservas")
    }

    const crearReservaYObtenerDatos = (url: string = "buscar", useTodos: boolean = true) => {
        if (url === "buscar") {
            cy.visit("buscar")
            if (useTodos) cy.get("#btn-todos").click()
            cy.get("#btn-reservar-1").click()
        } else {
            cy.visit(url)
        }
        cy.get("#pasajero-1").click()
        cy.get("#btn-confirmar").should("contain.text", "Confirmar Reserva").click()

        cy.get("#precio-total")
            .invoke("text")
            .then((totalText) => {
                const match = totalText.match(/\$([0-9.]+)/)
                cy.wrap(match ? parseFloat(match[1]) : 0).as(CYPRESS_VARIABLE_NAMES.TOTAL_PRICE)
            })

        cy.get("#codigo-reserva")
            .first()
            .invoke("text")
            .then((codigo) => {
                expect(codigo.trim()).to.match(/^SKY-[A-Z0-9]{6}$/)
                cy.wrap(codigo.trim()).as(CYPRESS_VARIABLE_NAMES.ASSIGNED_ID)
            })
    }

    const obtenerReservaId = (assignedId: string) => {
        return cy.get('[id^="reserva-panel-"]')
            .contains(assignedId)
            .parents('[id^="reserva-panel-"]')
            .invoke('attr', 'id')
            .then((panelId: string | undefined) => {
                return panelId?.replace('reserva-panel-', '')
            })
    }

    /**
     * 1. Cancelación de reserva pendiente: crear una reserva (Carlos en SR-1001 con cy.clock
        al 2026-04-14) y guardar el id devuelto. Ir a /reservas, expandir #reserva-panel-{id} y
        hacer clic en #btn-cancelar-{id}. El elemento #monto-reembolso debe mostrar el 100 %
        del precio total y el panel debe pasar a estado "cancelada".
    */
    it("1 - Cancelación de reserva pendiente: reembolso 100% y estado CANCELADA", () => {
        crearReservaYObtenerDatos()

        navigateToReservas()

        cy.get<string>(`@${CYPRESS_VARIABLE_NAMES.ASSIGNED_ID}`).then((assignedId) => {
            cy.get('[id^="reserva-panel-"]')
                .contains(assignedId)
                .parents('[id^="reserva-panel-"]')
                .click()

            cy.get('[id^="reserva-panel-"]')
                .contains(assignedId)
                .parents('[id^="reserva-panel-"]')
                .find('[id^="btn-cancelar-"]')
                .click()


            obtenerReservaId(assignedId).then((bookingId) => {
                cy.log(bookingId || "")
                cy.get(`#monto-reembolso-${bookingId}`).should("be.visible")

                cy.get<number>(`@${CYPRESS_VARIABLE_NAMES.TOTAL_PRICE}`).then((precioTotal) => {
                    cy.get(`#monto-reembolso-${bookingId}`).should("be.visible")
                    cy.get(`#monto-reembolso-${bookingId}`).invoke('text').then((text) => {
                        expect(text).to.include(precioTotal).to.include("(100%)")
                        // const monto = parseFloat(text.replace(/[^0-9.]/g, ""))
                        // expect(monto).to.equal(precioTotal)
                    })
                })
            })

            cy.get('[id^="reserva-panel-"]')
                .contains(String(assignedId))
                .parents('[id^="reserva-panel-"]')
                .should("contain.text", "CANCELADA")
        })
    })

    /**
     * 2. Confirmación: crear una reserva, expandir #reserva-panel-{id} y hacer clic en #btnconfirmar-{id}.
        La etiqueta de estado debe cambiar de "PENDIENTE" a "CONFIRMADA"
        sin recargar la página manualmente.
     */
    it("2 - Confirmación de reserva pendiente: PENDIENTE → CONFIRMADA", () => {
        crearReservaYObtenerDatos()

        navigateToReservas()

        cy.get<string>(`@${CYPRESS_VARIABLE_NAMES.ASSIGNED_ID}`).then((assignedId) => {
            obtenerReservaId(assignedId).then((reservaId) => {
                cy.wrap(reservaId).as(CYPRESS_VARIABLE_NAMES.BOOKING_ID)

                cy.get(`#reserva-panel-${reservaId}`).click()

                cy.get(`#reserva-panel-${reservaId}`).should("contain.text", "PENDIENTE")

                cy.get(`#btn-confirmar-${reservaId}`).click()

                cy.get(`#reserva-panel-${reservaId}`).should("contain.text", "CONFIRMADA")
                cy.get(`#btn-confirmar-${reservaId}`).should("not.exist")
            })
        })
    })

    /**
     * 3. Cancelación con más de 72 h: confirmar una reserva en SR-1004 (sale 2026-04-17
        08:00) con cy.clock fijado al 2026-04-13 08:00 (96 h antes) y cancelar. El reembolso
        esperado es el 80 % del total.
     */
    it("3 - Cancelación con más de 72 h: reembolso 80%", () => {
        cy.clock(new Date("2026-04-13T08:00:00").getTime())

        crearReservaYObtenerDatos("/reservar/4", false)

        navigateToReservas()

        cy.get<string>(`@${CYPRESS_VARIABLE_NAMES.ASSIGNED_ID}`).then((assignedId) => {
            obtenerReservaId(assignedId).then((reservaId) => {
                cy.wrap(reservaId).as(CYPRESS_VARIABLE_NAMES.BOOKING_ID)

                cy.get(`#reserva-panel-${reservaId}`).click()

                cy.get(`#btn-confirmar-${reservaId}`).click()

                cy.get(`#reserva-panel-${reservaId}`).should("contain.text", "CONFIRMADA")

                cy.get(`#btn-cancelar-${reservaId}`).click()

                cy.get<number>(`@${CYPRESS_VARIABLE_NAMES.TOTAL_PRICE}`).then((precioTotal) => {
                    cy.log(precioTotal.toString())
                    const reembolsoEsperado = Math.round(precioTotal * 0.80 * 100) / 100
                    cy.get(`#monto-reembolso-${reservaId}`).should("be.visible")
                    cy.get(`#monto-reembolso-${reservaId}`).invoke('text').then((text) => {
                        // const monto = parseFloat(text.replace(/[^0-9.]/g, ""))
                        // expect(monto).to.equal(reembolsoEsperado)
                        expect(text).to.include(reembolsoEsperado).to.include("(80%)")
                    })
                })

                cy.get(`#reserva-panel-${reservaId}`).should("contain.text", "CANCELADA")
            })
        })
    })

    /**
     * 4. Cancelación entre 24 y 72 h: misma reserva sobre SR-1004, ahora con cy.clock fijado
        al 2026-04-15 08:00 (48 h antes). El reembolso esperado es el 50 %.
     */
    it("4 - Cancelación entre 24 y 72 h: reembolso 50%", () => {
        cy.clock(new Date("2026-04-15T08:00:00").getTime())

        crearReservaYObtenerDatos("/reservar/4", false)

        navigateToReservas()

        cy.get<string>(`@${CYPRESS_VARIABLE_NAMES.ASSIGNED_ID}`).then((assignedId) => {
            obtenerReservaId(assignedId).then((reservaId) => {
                cy.wrap(reservaId).as(CYPRESS_VARIABLE_NAMES.BOOKING_ID)

                cy.get(`#reserva-panel-${reservaId}`).click()

                cy.get(`#btn-confirmar-${reservaId}`).click()

                cy.get(`#reserva-panel-${reservaId}`).should("contain.text", "CONFIRMADA")

                cy.get(`#btn-cancelar-${reservaId}`).click()

                cy.get<number>(`@${CYPRESS_VARIABLE_NAMES.TOTAL_PRICE}`).then((precioTotal) => {
                    const reembolsoEsperado = Math.round(precioTotal * 0.50 * 100) / 100
                    cy.get(`#monto-reembolso-${reservaId}`).should("be.visible")
                    cy.get(`#monto-reembolso-${reservaId}`).invoke('text').then((text) => {
                        // const monto = parseFloat(text.replace(/[^0-9.]/g, ""))
                        // expect(monto).to.equal(reembolsoEsperado)
                        expect(text).to.include(reembolsoEsperado).to.include("(50%)")
                    })
                })

                cy.get(`#reserva-panel-${reservaId}`).should("contain.text", "CANCELADA")
            })
        })
    })

    /**
     * 5. Cancelación con menos de 24 h: misma reserva, cy.clock al 2026-04-17 00:00 (8 h
        antes). El reembolso debe ser exactamente 0 USD; el #monto-reembolso debe seguir
        apareciendo con ese monto, sin simular un éxito engañoso.
     */
    it("5 - Cancelación con menos de 24 h: reembolso 0%", () => {
        cy.clock(new Date("2026-04-17T00:00:00").getTime())
        cy.log(new Date().toISOString())

        crearReservaYObtenerDatos("/reservar/4", false)

        navigateToReservas()

        cy.get<string>(`@${CYPRESS_VARIABLE_NAMES.ASSIGNED_ID}`).then((assignedId) => {
            obtenerReservaId(assignedId).then((reservaId) => {
                cy.wrap(reservaId).as(CYPRESS_VARIABLE_NAMES.BOOKING_ID)

                cy.get(`#reserva-panel-${reservaId}`).click()

                cy.get(`#btn-confirmar-${reservaId}`).click()

                cy.get(`#reserva-panel-${reservaId}`).should("contain.text", "CONFIRMADA")

                cy.get(`#btn-cancelar-${reservaId}`).click()

                cy.get(`#monto-reembolso-${reservaId}`).should("be.visible")
                cy.get(`#monto-reembolso-${reservaId}`).invoke('text').then((text) => {
                    // const monto = parseFloat(text.replace(/[^0-9.]/g, ""))
                    // expect(monto).to.equal(0)
                    expect(text).to.include("$0").to.include("(0%)")
                })

                cy.get(`#reserva-panel-${reservaId}`).should("contain.text", "CANCELADA")
            })
        })
    })
})
