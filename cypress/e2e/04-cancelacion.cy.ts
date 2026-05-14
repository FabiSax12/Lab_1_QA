const CYPRESS_VARIABLE_NAMES = {
    TOTAL_PRICE: "precioTotal",
    ASSIGNED_ID: "assignedId",
    BOOKING_ID: "bookingId"
}

describe("Estados de la reserva", () => {
    const navigateToReservas = () => {
        cy.get("#sidebar-link-reservas").click()
        cy.url().should("include", "/reservas")
    }

    const crearReservaYObtenerDatos = (url: string = "/buscar", useTodos: boolean = true) => {
        if (url === "/buscar") {
            cy.visit("/buscar")
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

    describe("Misma fecha: 14 Abril 2026", () => {
        const testingDate = new Date("2026-04-14T12:00:00")

        beforeEach(() => {
            cy.clock(testingDate.getTime(), ["Date"])
        })

        afterEach(() => {
            cy.clock().then(clock => clock.restore())
        })


        // Caso: 1 - Cancelación de reserva pendiente
        // Objetivo: Verificar que una reserva pendiente cancelada devuelve 100% de reembolso
        // Datos de entrada: Reserva con estado PENDIENTE, fecha del sistema 2026-04-14 12:00
        // Resultado esperado: Estado CANCELADA y monto-reembolso muestra 100% del precio total
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
                    cy.get(`#monto-reembolso-${bookingId}`).should("be.visible")

                    cy.get<number>(`@${CYPRESS_VARIABLE_NAMES.TOTAL_PRICE}`).then((precioTotal) => {
                        cy.get(`#monto-reembolso-${bookingId}`).should("be.visible")

                        cy.get(`#monto-reembolso-${bookingId}`).invoke("text").then((text) => {
                            const match = text.match(/\$([0-9.]+)/)
                            const monto = match ? parseFloat(match[1]) : 0
                            cy.log(monto.toString())
                            cy.log(text, " ", monto)
                            expect(text).to.include("(100%)")
                            expect(monto).to.equal(precioTotal)
                        })
                    })
                })

                cy.get('[id^="reserva-panel-"]')
                    .contains(String(assignedId))
                    .parents('[id^="reserva-panel-"]')
                    .should("contain.text", "CANCELADA")
            })
        })

        // Caso: 2 - Confirmación de reserva pendiente
        // Objetivo: Verificar que una reserva pendiente puede confirmarse sin recarga de página
        // Datos de entrada: Reserva con estado PENDIENTE
        // Resultado esperado: Estado cambia de PENDIENTE a CONFIRMADA, btn-confirmar desaparece
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
    })

    describe("Pruebas con fechas distintas", () => {
        beforeEach(() => {
            cy.clock().then(clock => clock.restore())
        })

        // Caso: 3 - Cancelación con más de 72 horas
        // Objetivo: Verificar que una reserva confirmada con >72h antes del vuelo devuelve 80% de reembolso
        // Datos de entrada: Reserva SR-1004 confirmada, cy.clock 2026-04-13 08:00 (96h antes del vuelo 2026-04-17 08:00)
        // Resultado esperado: Estado CANCELADA y monto-reembolso muestra 80% del precio total
        it("3 - Cancelación con más de 72 h: reembolso 80%", () => {
            cy.clock(new Date("2026-04-13T08:00:00").getTime(), ["Date"])

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
                        const reembolsoEsperado = Math.round(precioTotal * 0.80 * 100) / 100
                        cy.get(`#monto-reembolso-${reservaId}`).should("be.visible")
                        cy.get(`#monto-reembolso-${reservaId}`).invoke("text").then((text) => {
                            const match = text.match(/\$([0-9.]+)/)
                            const monto = match ? parseFloat(match[1]) : 0
                            expect(monto).to.equal(reembolsoEsperado)
                            expect(text).to.include("(80%)")
                        })
                    })

                    cy.get(`#reserva-panel-${reservaId}`).should("contain.text", "CANCELADA")
                })
            })
        })

        // Caso: 4 - Cancelación entre 24 y 72 horas
        // Objetivo: Verificar que una reserva confirmada con 24-72h antes del vuelo devuelve 50% de reembolso
        // Datos de entrada: Reserva SR-1004 confirmada, cy.clock 2026-04-15 08:00 (48h antes del vuelo 2026-04-17 08:00)
        // Resultado esperado: Estado CANCELADA y monto-reembolso muestra 50% del precio total
        it("4 - Cancelación entre 24 y 72 h: reembolso 50%", () => {
            cy.clock(new Date("2026-04-15T08:00:00").getTime(), ["Date"])

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
                        cy.get(`#monto-reembolso-${reservaId}`).invoke("text").then((text) => {
                            const match = text.match(/\$([0-9.]+)/)
                            const monto = match ? parseFloat(match[1]) : 0
                            expect(monto).to.equal(reembolsoEsperado)
                            expect(text).to.include("(50%)")
                        })
                    })

                    cy.get(`#reserva-panel-${reservaId}`).should("contain.text", "CANCELADA")
                })
            })
        })

        // Caso: 5 - Cancelación con menos de 24 horas
        // Objetivo: Verificar que una reserva confirmada con <24h antes del vuelo devuelve 0% de reembolso
        // Datos de entrada: Reserva SR-1004 confirmada, cy.clock 2026-04-17 00:00 (8h antes del vuelo 2026-04-17 08:00)
        // Resultado esperado: Estado CANCELADA y monto-reembolso muestra $0 (0%)
        it("5 - Cancelación con menos de 24 h: reembolso 0%", () => {
            cy.clock(new Date("2026-04-17T00:00:00").getTime(), ["Date"])

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
                    cy.get(`#monto-reembolso-${reservaId}`).invoke("text").then((text) => {
                        const match = text.match(/\$([0-9.]+)/)
                        const monto = match ? parseFloat(match[1]) : 0
                        expect(monto).to.equal(0)
                        expect(text).to.include("(0%)")
                    })

                    cy.get(`#reserva-panel-${reservaId}`).should("contain.text", "CANCELADA")
                })
            })
        })
    })

})
