/**
 * Custom extension for BMP280 and AHT20 sensors for micro:bit
 * Funciona bien leyendo los datos del BMP280 pero no del AHT20
 */

enum BMP280_I2C_ADDRESS {
    //% block="0x76"
    ADDR_0x76 = 0x76,
    //% block="0x77"
    ADDR_0x77 = 0x77
}

//% weight=100 color=#5045f6 icon="\uf2c9" block="Environmental Sensors"
namespace environmentalSensors {
    let BMP280_I2C_ADDR = BMP280_I2C_ADDRESS.ADDR_0x77; // Default to 0x77
    let AHT20_I2C_ADDR = 0x38; // Standard I2C address for AHT20

    // Define BMP280 register setup function consistently
    function writeBMP280Reg(reg: number, value: number): void {
        let buffer = pins.createBuffer(2);
        buffer[0] = reg;
        buffer[1] = value;
        pins.i2cWriteBuffer(BMP280_I2C_ADDR, buffer);
    }
    // Initialize calibration data variables for BMP280
    let bmp280_calib_T1 = 0;
    let bmp280_calib_T2 = 0;
    let bmp280_calib_T3 = 0;
    let bmp280_calib_P1 = 0;
    let bmp280_calib_P2 = 0;
    let bmp280_calib_P3 = 0;
    let bmp280_calib_P4 = 0;
    let bmp280_calib_P5 = 0;
    let bmp280_calib_P6 = 0;
    let bmp280_calib_P7 = 0;
    let bmp280_calib_P8 = 0;
    let bmp280_calib_P9 = 0;

    // Read calibration data from BMP280
    function readBMP280CalibrationData(): void {
        bmp280_calib_T1 = getUInt16LE(BMP280_I2C_ADDR, 0x88);
        bmp280_calib_T2 = getInt16LE(BMP280_I2C_ADDR, 0x8A);
        bmp280_calib_T3 = getInt16LE(BMP280_I2C_ADDR, 0x8C);
        bmp280_calib_P1 = getUInt16LE(BMP280_I2C_ADDR, 0x8E);
        bmp280_calib_P2 = getInt16LE(BMP280_I2C_ADDR, 0x90);
        bmp280_calib_P3 = getInt16LE(BMP280_I2C_ADDR, 0x92);
        bmp280_calib_P4 = getInt16LE(BMP280_I2C_ADDR, 0x94);
        bmp280_calib_P5 = getInt16LE(BMP280_I2C_ADDR, 0x96);
        bmp280_calib_P6 = getInt16LE(BMP280_I2C_ADDR, 0x98);
        bmp280_calib_P7 = getInt16LE(BMP280_I2C_ADDR, 0x9A);
        bmp280_calib_P8 = getInt16LE(BMP280_I2C_ADDR, 0x9C);
        bmp280_calib_P9 = getInt16LE(BMP280_I2C_ADDR, 0x9E);
    }


    function getUInt16LE(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(addr, NumberFormat.UInt16LE, true);
    }

    function getInt16LE(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(addr, NumberFormat.Int16LE, true);
    }

    //% blockId="BMP280_GET_PRESSURE" block="get pressure"
    export function getPressure(): number {
        // Complete logic based on BMP280 datasheet
        let t_fine = calculateBMP280TemperatureFine(); // Also updates temperature
        let adc_P = get24BitRegister(BMP280_I2C_ADDR, 0xF7);
        let var1 = (t_fine / 2) - 64000;
        let var2 = (((var1 / 4) * (var1 / 4)) / 2048) * bmp280_calib_P6;
        var2 += ((var1 * bmp280_calib_P5) * 2);
        var2 = (var2 / 4) + (bmp280_calib_P4 * 65536);
        var1 = (((bmp280_calib_P3 * (((var1 / 4) * (var1 / 4)) / 8192)) / 8) + ((bmp280_calib_P2 * var1) / 2)) / 262144;
        var1 = ((32768 + var1) * bmp280_calib_P1) / 32768;

        if (var1 === 0) {
            return 0; // avoid division by zero
        }

        let p = 1048576 - adc_P;
        p = ((p - (var2 / 4096)) * 3125);
        p = (p / var1) * 2;
        var1 = (bmp280_calib_P9 * (((p / 8) * (p / 8)) / 8192)) / 4096;
        var2 = ((p / 4) * bmp280_calib_P8) / 8192;
        p = p + ((var1 + var2 + bmp280_calib_P7) / 16);

        // Adjust for two decimals without toFixed
        p = Math.round((p / 100) * 100) / 100; // Convert to hPa and adjust to two decimal places
        return p;
    }

    function calculateBMP280TemperatureFine(): number {
        let adc_T = get24BitRegister(BMP280_I2C_ADDR, 0xFA);
        let var1 = (((adc_T >> 3) - (bmp280_calib_T1 << 1)) * bmp280_calib_T2) >> 11;
        let var2 = (((((adc_T >> 4) - bmp280_calib_T1) * ((adc_T >> 4) - bmp280_calib_T1)) / 2048) * bmp280_calib_T3) >> 14;
        return var1 + var2; // This value is used to calculate pressure
    }

    function get24BitRegister(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        let msb = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
        let lsb = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
        let xlsb = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
        return (msb << 12) | (lsb << 4) | (xlsb >> 4);
    }

    //% blockId="BMP280_GET_TEMPERATURE" block="get BMP temperature"
    export function getTemperatureBMP(): number {
        let t_fine = calculateBMP280TemperatureFine();
        let T = (t_fine * 5 + 128) >> 8;
        return T / 100; // Convert to degrees Celsius
    }

    //% blockId="BMP280_CALCULATE_ALTITUDE" block="estimate altitude with pressure %pressure"
    export function estimateAltitude(pressure: number): number {
        const seaLevelPressure = 1013.25; // Standard sea-level pressure in hPa
        return 44330 * (1 - Math.pow(pressure / seaLevelPressure, 0.1903));
    }


    // AHT20 functions

    //% blockId="initialize_AHT20" block="initialize AHT20"
    export function initializeAHT20(): boolean {
        const AHT20_I2C_ADDR = 0x38;
        let buffer = pins.createBuffer(1);

        // Soft reset
        buffer[0] = 0xBA; // AHTX0_CMD_SOFTRESET
        pins.i2cWriteBuffer(AHT20_I2C_ADDR, buffer);
        basic.pause(20);

        // Check if sensor is busy and wait until it is ready
        while ((getStatus() & 0x80) !== 0) { // AHTX0_STATUS_BUSY
            basic.pause(10);
        }

        // Send calibration command
        buffer = pins.createBuffer(3);
        buffer[0] = 0xE1; // AHTX0_CMD_CALIBRATE
        buffer[1] = 0x08;
        buffer[2] = 0x00;
        pins.i2cWriteBuffer(AHT20_I2C_ADDR, buffer);

        // Wait for calibration to complete
        while ((getStatus() & 0x80) !== 0) { // AHTX0_STATUS_BUSY
            basic.pause(10);
        }

        // Check if calibrated
        if ((getStatus() & 0x08) !== 0x08) { // AHTX0_STATUS_CALIBRATED
            return false;
        }

        return true;
    }

    function getStatus(): number {
        let status = pins.i2cReadNumber(0x38, NumberFormat.UInt8BE, true);
        return status;
    }


    //% blockId="read_temperature_from_AHT20" block="read temperature from AHT20"
    export function readTemperatureAHT20(): number {
        if (!initializeAHT20()) {
            return null; // Retorna null si la inicialización falla
        }

        let buffer = pins.createBuffer(3);
        buffer[0] = 0xAC; // AHTX0_CMD_TRIGGER
        buffer[1] = 0x33;
        buffer[2] = 0x00;
        pins.i2cWriteBuffer(AHT20_I2C_ADDR, buffer);

        // Esperar mientras el sensor está ocupado
        while ((getStatus() & 0x80) !== 0) {
            basic.pause(10);
        }

        let data = pins.i2cReadBuffer(AHT20_I2C_ADDR, 6);
        if (data.length !== 6) {
            return null; // Retorna null si la lectura falla
        }
        let tempRaw = ((data[3] & 0x0F) << 16) | (data[4] << 8) | data[5];
        let temperature = (tempRaw * 200.0 / 0x100000) - 50;

        return temperature;
    }

    //% blockId="read_humidity_from_AHT20" block="read humidity from AHT20"
    export function readHumidityAHT20(): number {
        if (!initializeAHT20()) {
            return null; // Retorna null si la inicialización falla
        }

        let buffer = pins.createBuffer(3);
        buffer[0] = 0xAC; // AHTX0_CMD_TRIGGER
        buffer[1] = 0x33;
        buffer[2] = 0x00;
        pins.i2cWriteBuffer(AHT20_I2C_ADDR, buffer);

        // Esperar mientras el sensor está ocupado
        while ((getStatus() & 0x80) !== 0) {
            basic.pause(10);
        }

        let data = pins.i2cReadBuffer(AHT20_I2C_ADDR, 6);
        if (data.length !== 6) {
            return null; // Retorna null si la lectura falla
        }
        let humidity = ((data[1] << 12) | (data[2] << 4) | (data[3] >> 4)) * 100 / 0x100000;

        return humidity;
    }

    //% blockId="BMP280_POWER_ON" block="Power On BMP280"
    export function powerOnBMP280(): void {
        writeBMP280Reg(0xF4, 0x2F); // Configuration for normal mode
        readBMP280CalibrationData(); // Read calibration data
    }

    //% blockId="BMP280_POWER_OFF" block="Power Off BMP280"
    export function powerOffBMP280(): void {
        writeBMP280Reg(0xF4, 0x00); // Put the sensor in sleep mode
    }
}