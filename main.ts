namespace weatherSensors {
    export let AHT20_I2C_ADDR = 0x38; // Dirección I2C del AHT20
    export let BMP280_I2C_ADDR = 0x76; // Dirección I2C del BMP280
    export let seaLevelhPa: number = 101325; // Presión estándar al nivel del mar en Pascales

    // Estado de inicialización para evitar re-inicializaciones innecesarias
    export let isAHT20Initialized = false;
    export let isBMP280Initialized = false;

    /**
     * Inicializa el sensor AHT20.
     */
    //% block="initialize AHT20"
    //% weight=100
    //% group="Configuration"
    export function initAHT20() {
        if (!isAHT20Initialized) {
            let initCmd = pins.createBuffer(3);
            initCmd[0] = 0xE1; // Comando de inicialización
            initCmd[1] = 0x08;
            initCmd[2] = 0x00;
            pins.i2cWriteBuffer(AHT20_I2C_ADDR, initCmd, false);
            basic.pause(10);
            isAHT20Initialized = true;
        }
    }

    /**
     * Inicializa el sensor BMP280.
     */
    //% block="initialize BMP280"
    //% weight=100
    //% group="Configuration"
    export function initBMP280() {
        if (!isBMP280Initialized) {
            let ctrlMeas = pins.createBuffer(2);
            ctrlMeas[0] = 0xF4; // Dirección del registro de control de medición
            ctrlMeas[1] = 0x27; // 00100111: modo normal, oversampling x1
            pins.i2cWriteBuffer(BMP280_I2C_ADDR, ctrlMeas, false);
            let config = pins.createBuffer(2);
            config[0] = 0xF5; // Dirección del registro de configuración
            config[1] = 0xA0; // 10100000: filtro off, standby time 1000 ms
            pins.i2cWriteBuffer(BMP280_I2C_ADDR, config, false);
            basic.pause(100);
            isBMP280Initialized = true;
        }
    }

    /**
     * Lee la temperatura del AHT20 en grados Celsius.
     */
    //% block="read temperature from AHT20"
    //% weight=90
    //% group="Sensors"
    export function readTemperature(): number {
        initAHT20();
        let buffer = pins.i2cReadBuffer(AHT20_I2C_ADDR, 6, false);
        let temperature = -40 + ((buffer[3] & 0xFF) << 8 | (buffer[4] & 0xFF)) * 0.02;
        return temperature;
    }

    /**
     * Lee la humedad del AHT20 en porcentaje.
     */
    //% block="read humidity from AHT20"
    //% weight=85
    //% group="Sensors"
    export function readHumidity(): number {
        initAHT20();
        let buffer2 = pins.i2cReadBuffer(AHT20_I2C_ADDR, 6, false);
        let humidity = ((buffer2[1] & 0xFF) << 8 | (buffer2[2] & 0xFF)) * 0.0244;
        return humidity;
    }

    /**
     * Lee la presión del BMP280 en Pascales.
     */
    //% block="read pressure from BMP280"
    //% weight=80
    //% group="Sensors"
    export function readPressure(): number {
        initBMP280();
        let buffer3 = pins.i2cReadBuffer(BMP280_I2C_ADDR, 3, false);
        let pressure = ((buffer3[0] & 0xFF) << 12 | (buffer3[1] & 0xFF) << 4 | (buffer3[2] & 0xFF) >> 4);
        return pressure;
    }

    /**
     * Calcula la altitud basada en la presión del BMP280 en metros.
     */
    //% block="calculate altitude from BMP280 pressure"
    //% weight=75
    //% group="Calculations"
    export function calculateAltitude(): number {
        let pressure2 = readPressure();
        let altitude = 44330 * (1 - Math.pow(pressure2 / seaLevelhPa, 0.1903));
        return altitude;
    }
}
