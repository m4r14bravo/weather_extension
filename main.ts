// Namespace para organizar la extensión
namespace weatherSensors {
    let AHT20_I2C_ADDR = 0x38; // Dirección I2C del AHT20
    let BMP280_I2C_ADDR = 0x76; // Dirección I2C del BMP280
    let seaLevelhPa: number = 101325; // Presión estándar al nivel del mar en Pascales

    // Variables de estado para verificar si los sensores están inicializados
    let isAHT20Initialized = false;
    let isBMP280Initialized = false;

    // Inicializa el sensor AHT20
    function initAHT20() {
        if (!isAHT20Initialized) {
            let initCmd = pins.createBuffer(3);
            initCmd[0] = 0xE1; // Comando de inicialización
            initCmd[1] = 0x08;
            initCmd[2] = 0x00;
            pins.i2cWriteBuffer(AHT20_I2C_ADDR, initCmd, false);
            basic.pause(10); // Espera para que el sensor se estabilice
            isAHT20Initialized = true;
        }
    }

    // Inicializa el sensor BMP280
    function initBMP280() {
        if (!isBMP280Initialized) {
            let ctrlMeas = pins.createBuffer(2);
            ctrlMeas[0] = 0xF4; // Dirección del registro de control de medición
            ctrlMeas[1] = 0x27; // 00100111: modo normal, oversampling x1 para presión y temperatura
            pins.i2cWriteBuffer(BMP280_I2C_ADDR, ctrlMeas, false);

            let config = pins.createBuffer(2);
            config[0] = 0xF5; // Dirección del registro de configuración
            config[1] = 0xA0; // 10100000: filtro off, standby time 1000 ms
            pins.i2cWriteBuffer(BMP280_I2C_ADDR, config, false);

            basic.pause(100); // Espera para que el sensor se estabilice
            isBMP280Initialized = true;
        }
    }

    // Lee la temperatura del AHT20
    //% blockId="read_aht20_temperature" block="read temperature from AHT20"
    //% weight=100 group="AHT20"
    export function readTemperature(): number {
        initAHT20();
        let buffer = pins.i2cReadBuffer(AHT20_I2C_ADDR, 6, false);
        let temperature = -40 + ((buffer[3] & 0xFF) << 8 | (buffer[4] & 0xFF)) * 0.02;
        return temperature;
    }

    // Lee la humedad del AHT20
    //% blockId="read_aht20_humidity" block="read humidity from AHT20"
    //% weight=95 group="AHT20"
    export function readHumidity(): number {
        initAHT20();
        let buffer = pins.i2cReadBuffer(AHT20_I2C_ADDR, 6, false);
        let humidity = ((buffer[1] & 0xFF) << 8 | (buffer[2] & 0xFF)) * 0.0244;
        return humidity;
    }

    // Lee la presión del BMP280
    //% blockId="read_bmp280_pressure" block="read pressure from BMP280"
    //% weight=90 group="BMP280"
    export function readPressure(): number {
        initBMP280();
        let buffer = pins.i2cReadBuffer(BMP280_I2C_ADDR, 3, false);
        let pressure = ((buffer[0] & 0xFF) << 12 | (buffer[1] & 0xFF) << 4 | (buffer[2] & 0xFF) >> 4);
        return pressure;
    }

    // Calcula la altitud basada en la presión del BMP280
    //% blockId="calculate_altitude" block="calculate altitude from BMP280 pressure"
    //% weight=80 group="BMP280"
    export function calculateAltitude(): number {
        let pressure = readPressure();
        let altitude = 44330 * (1 - Math.pow(pressure / seaLevelhPa, 0.1903));
        return altitude;
    }
}
