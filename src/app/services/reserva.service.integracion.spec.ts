import { IPasajeroService } from "../interfaces/ipasajero.service";
import { IPrecioService } from "../interfaces/iprecio.service";
import { IVueloService } from "../interfaces/ivuelo.service";
import { CategoriaPasajero, Pasajero } from "../models/pasajero.model";
import { OpcionesReserva, Vuelo } from "../models/vuelo.model";
import { PasajeroService } from "./pasajero.service";
import { PrecioService } from "./precio.service";
import { ReservaService } from "./reserva.service";
import { VueloService } from "./vuelo.service";

// Templates para evitar escribir objetos grandes constantemente
function createFly(overrides: Partial<Vuelo> = {}): Vuelo {
    return {
        id: 144,
        aerolinea: "Avianca",
        asientosOcupados: 5,
        asientosTotales: 10,
        clase: "economica",
        codigo: "AV-1234",
        destino: "Aeropuerto Juan Santamaria",
        duracionMinutos: 240,
        equipajeIncluidoKg: 50,
        escalas: [],
        estado: "programado",
        fechaLlegada: new Date(Date.now() + 28 * 60 * 60 * 1000),
        fechaSalida: new Date(Date.now() + 24 * 60 * 60 * 1000),
        origen: "Panama Airport",
        paisDestino: "Panama",
        paisOrigen: "Costa Rica",
        precioBase: 100000,
        tieneComida: true,
        tieneWifi: false,
        ...overrides,
    };
}

function createPassenger(overrides: Partial<Pasajero> = {}): Pasajero {
    return {
        id: 1,
        nombre: "Test",
        apellido: "User",
        pasaporte: "AB1234567",
        nacionalidad: "CR",
        fechaNacimiento: new Date("1990-01-01"),
        email: "test@test.com",
        telefono: "+50612345678",
        genero: "M",
        miembroFrecuente: false,
        nivelFrecuente: "ninguno",
        millasAcumuladas: 0,
        necesidadesEspeciales: [],
        visasVigentes: [],
        contactoEmergencia: { nombre: "Emergency", telefono: "+50687654321", relacion: "Padre" },
        ...overrides,
    };
}

function createOptions(overrides: Partial<OpcionesReserva> = {}): OpcionesReserva {
    return {
        equipajeExtra: false,
        seleccionAsiento: false,
        seguroViaje: false,
        comidaEspecial: null,
        prioridadAbordaje: false,
        ...overrides,
    };
}

describe("ReservaService", () => {

    /**
     * Un dummy estricto es un objeto cuyos métodos lanzan Error en cuanto son invocados. Sirve
     * para certificar que ciertas rutas del código no tocan colaboradores que no les corresponden.
     * Una implementación compacta utiliza Proxy.
     */
    describe("Validaciones de entrada con Dummies", () => {

        // Lógica para Dummies

        function strictDummy<T>(name: string): T {
            return new Proxy({}, {
                get: () => () => { throw new Error(`Dummy ${name} has been invoked`) }
            }) as T;
        }

        const flyDouble = strictDummy<VueloService>("VueloService");
        const passengerDouble = strictDummy<PasajeroService>("PasajeroService");
        const priceDouble = strictDummy<PrecioService>("PrecioService");

        const service = new ReservaService(
            flyDouble,
            passengerDouble,
            priceDouble,
        );

        const options = createOptions();

        /**
         * Invocar crearReserva(1, [], opciones). El resultado debe tener exito en false y el error
         * debe contener "al menos 1 pasajero". La validación 1 corta antes de llegar a los
         * colaboradores.
         */
        it("debe rechazar reservas sin pasajeros", () => {
            const result = service.crearReserva(1, [], options);

            expect(result.exito).toBeFalse();
            expect(result.error).toContain("al menos 1 pasajero");
        });

        /**
         * Invocar crearReserva(1, arregloDe10Pasajeros, opciones). El resultado debe tener exito
         * en false y el error debe contener "más de 9 pasajeros". La validación 2 corta antes que
         * los colaboradores sean invocados.
         */
        it("debe rechazar reservas con más de 9 pasajeros", () => {
            const passengers: Pasajero[] = Array.from({ length: 10 }, (_, i) =>
                createPassenger({ id: i + 1 })
            );

            const result = service.crearReserva(1, passengers, options);

            expect(result.exito).toBeFalse();
            expect(result.error).toContain("más de 9 pasajeros");
        });
    });

    /**
     * Los stubs implementan la firma completa de la interfaz con respuestas fijas. Solo se
     * configuran con precisión los métodos que la prueba requiere; el resto devuelve valores
     * inocuos.
     */
    describe("Comportamiento con Stubs", () => {

        const flyStub: IVueloService = {
            actualizarAsientosOcupados(vueloId, cantidad) {
                return true;
            },

            buscarPorId(id) {
                return createFly();
            },

            /** El comentario ahora coincide con el valor retornado. */
            obtenerAsientosDisponibles(vueloId) {
                return 10;
            },

            buscarVuelos(origen, destino, fecha) {
                throw new Error("no llamado");
            },

            obtenerEstadoVuelo(vueloId) {
                throw new Error("no llamado");
            },

            obtenerTodos() {
                throw new Error("no llamado");
            },

            obtenerVuelosDisponibles() {
                throw new Error("no llamado");
            },
        };

        const passengerStub: IPasajeroService = {
            calcularCategoria(fechaNacimiento) {
                return "adulto";
            },

            validarPasajero(pasajero) {
                return { errores: [], valido: true };
            },

            verificarDocumentos(pasajero, paisDestino) {
                return { aprobado: true, razon: "" };
            },

            calcularMillasGanadas(duracionMinutos, clase, nivelFrecuente) {
                throw new Error("no llamado");
            },

            obtenerBeneficiosFrecuente(pasajero) {
                throw new Error("no llamado");
            },

            obtenerPorId(id) {
                throw new Error("no llamado");
            },
        };

        const priceStub: IPrecioService = {
            calcularPrecioGrupal(vuelo, pasajeros, opciones) {
                return {
                    cargoClase: 0,
                    cargoOpciones: 0,
                    descuentoCategoria: 0,
                    descuentoFrecuente: 0,
                    impuestos: 0,
                    moneda: "CRC",
                    precioBase: 100000,
                    subtotal: 100000,
                    tasaCambio: 1,
                    total: 100000,
                };
            },

            aplicarDescuentoFrecuente(precio, nivelFrecuente) {
                throw new Error("no llamado");
            },

            calcularImpuestos(subtotal, paisOrigen, paisDestino) {
                throw new Error("no llamado");
            },

            calcularPrecioIndividual(vuelo, pasajero, opciones) {
                throw new Error("no llamado");
            },

            convertirMoneda(monto, monedaDestino) {
                throw new Error("no llamado");
            },
        };

        const newService = () =>
            new ReservaService(
                flyStub as unknown as VueloService,
                passengerStub as unknown as PasajeroService,
                priceStub as unknown as PrecioService,
            );

        /**
         * Camino feliz: vuelo programado con fechaSalida futura y clase económica, diez asientos
         * disponibles, validación de pasajero positiva, documentos aprobados y cálculo de precio
         * exitoso. La reserva retornada debe tener estado igual a "pendiente" y un codigoReserva
         * que coincida con la expresión regular /^SKY-[A-Z0-9]{6}$/.
         */
        it("debe crear reserva pendiente en el camino feliz", () => {
            const service = newService();
            const result = service.crearReserva(1, [createPassenger()], createOptions());

            expect(result.exito).toBeTrue();
            expect(result.reserva?.estado).toBe("pendiente");
            expect(result.reserva?.codigoReserva).toMatch(/^SKY-[A-Z0-9]{6}$/);
        });

        /**
         * Stub de buscarPorId que retorna undefined. El error debe contener "no encontrado" y
         * reserva debe ser null.
         */
        it("debe rechazar cuando el vuelo no existe", () => {
            const stub: IVueloService = {
                ...flyStub,
                buscarPorId(id) { return undefined; },
            };

            const service = new ReservaService(
                stub as unknown as VueloService,
                passengerStub as unknown as PasajeroService,
                priceStub as unknown as PrecioService,
            );

            const result = service.crearReserva(1, [createPassenger()], createOptions());

            expect(result.exito).toBeFalse();
            expect(result.error).toContain("no encontrado");
            expect(result.reserva).toBeNull();
        });

        /**
         * Stub de buscarPorId que retorna un vuelo con estado "cancelado". El error debe
         * contener "no está disponible". Demuestra cómo la factory aVuelo recibe overrides
         * para expresar únicamente el estado que difiere del default.
         */
        it("debe rechazar cuando el vuelo está cancelado", () => {
            const stub: IVueloService = {
                ...flyStub,
                buscarPorId(id) { return createFly({ estado: "cancelado" }); },
            };
            const service = new ReservaService(
                stub as unknown as VueloService,
                passengerStub as unknown as PasajeroService,
                priceStub as unknown as PrecioService,
            );

            const result = service.crearReserva(1, [createPassenger()], createOptions());

            expect(result.exito).toBeFalse();
            expect(result.error).toContain("no está disponible");
        });

        /**
         * Stub de obtenerAsientosDisponibles que retorna 1 mientras se intenta reservar para dos
         * pasajeros. El error debe contener "No hay suficientes asientos".
         */
        it("debe rechazar cuando no hay asientos suficientes", () => {
            const stub: IVueloService = {
                ...flyStub,
                obtenerAsientosDisponibles(vueloId) { return 1; },
            };
            const service = new ReservaService(
                stub as unknown as VueloService,
                passengerStub as unknown as PasajeroService,
                priceStub as unknown as PrecioService,
            );

            const passengers = [createPassenger(), createPassenger({ id: 2 })];
            const result = service.crearReserva(1, passengers, createOptions());

            expect(result.exito).toBeFalse();
            expect(result.error).toContain("No hay suficientes asientos");
        });
    });

    /**
     * Un spy extiende al stub con contadores y registros de argumentos. La forma más simple de
     * implementarlo es mediante variables externas compartidas o propiedades del propio objeto.
     */
    describe("Verificación de interacciones con Spies", () => {
        /**
         * Al invocar crearReserva(42, [pasajero], opciones), el spy de buscarPorId debe haber
         * recibido exactamente una llamada con argumento 42.
         */
        it("debe llamar a buscarPorId con el id del vuelo", () => { });

        /**
         * Al reservar con tres pasajeros distintos, el spy de validarPasajero debe haber recibido
         * exactamente tres llamadas.
         */
        it("debe llamar a validarPasajero una vez por cada pasajero", () => { });

        /**
         * Al reservar con dos pasajeros, el spy de actualizarAsientosOcupados debe registrar una
         * invocación con el vueloId correcto y el valor 2 como delta positivo. Si la prueba descubre
         * un comportamiento distinto, se documenta como hallazgo.
         */
        it("debe llamar a actualizarAsientosOcupados con vueloId y delta correctos", () => { });

        /**
         * Usando un arreglo compartido donde cada spy registra el nombre del método al ser
         * invocado, verificar que validarPasajero se ejecuta antes que verificarDocumentos y que
         * ambos preceden a calcularPrecioGrupal.
         */
        it("debe ejecutar validarPasajero antes que verificarDocumentos y ambos antes que calcularPrecioGrupal", () => { });
    });

    /**
     * Se construye un FakeVueloService que mantiene un Map interno de vuelos y responde de
     * forma coherente a las consultas y actualizaciones. A diferencia de un stub, este fake
     * modifica realmente su estado cuando se le llama, por lo que operaciones sucesivas
     * observan los efectos acumulados.
     */
    describe("Integridad de estado con Fakes", () => {
        /**
         * Precargar un vuelo con asientosTotales 10 y asientosOcupados 5. Tras crearReserva
         * con dos pasajeros válidos, obtenerAsientosDisponibles debe retornar 3.
         */
        it("debe reducir los asientos disponibles al reservar", () => { });

        /**
         * Continuando con el vuelo anterior, cancelar la reserva recién creada. Al consultar de
         * nuevo, obtenerAsientosDisponibles debe retornar 5, confirmando que el delta negativo
         * revirtió el estado.
         */
        it("debe liberar asientos al cancelar una reserva", () => { });

        /**
         * Precargar un vuelo con asientosTotales 4 y asientosOcupados 2. Una primera reserva
         * de dos pasajeros tiene éxito. Una segunda reserva de dos pasajeros falla con error que
         * contiene "No hay suficientes asientos".
         */
        it("debe rechazar cuando no hay asientos libres tras reservas previas", () => { });

        /**
         * Construir un FakePasajeroService que aplica la expresión regular /^[A-Z]{2}\d{7}$/ en
         * validarPasajero. Al invocar crearReserva con un pasajero cuyo pasaporte es "ABC123",
         * el resultado debe tener exito en false y el error debe contener "pasaporte".
         */
        it("debe rechazar pasajeros con pasaporte inválido", () => { });
    });

});
