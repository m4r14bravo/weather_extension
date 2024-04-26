/**
 * Custom extension for BMP280 and AHT20 sensors for micro:bit
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
        bmp280_calib_T1 = getUInt16LE(0x88);
        bmp280_calib_T2 = getInt16LE(0x8A);
        bmp280_calib_T3 = getInt16LE(0x8C);
        bmp280_calib_P1 = getUInt16LE(0x8E);
        bmp280_calib_P2 = getInt16LE(0x90);
        bmp280_calib_P3 = getInt16LE(0x92);
        bmp280_calib_P4 = getInt16LE(0x94);
        bmp280_calib_P5 = getInt16LE(0x96);
        bmp280_calib_P6 = getInt16LE(0x98);
        bmp280_calib_P7 = getInt16LE(0x9A);
        bmp280_calib_P8 = getInt16LE(0x9C);
        bmp280_calib_P9 = getInt16LE(0x9E);
    }

    function getUInt16LE(reg: number): number {
        pins.i2cWriteNumber(BMP280_I2C_ADDR, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(BMP280_I2C_ADDR, NumberFormat.UInt16LE, true);
    }

    function getInt16LE(reg: number): number {
        pins.i2cWriteNumber(BMP280_I2C_ADDR, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(BMP280_I2C_ADDR, NumberFormat.Int16LE, true);
    }

    function get24BitRegister(reg: number): number {
        pins.i2cWriteNumber(BMP280_I2C_ADDR, reg, NumberFormat.UInt8BE);
        let msb = pins.i2cReadNumber(BMP280_I2C_ADDR, NumberFormat.UInt8BE);
        let lsb = pins.i2cReadNumber(BMP280_I2C_ADDR, NumberFormat.UInt8BE);
        let xlsb = pins.i2cReadNumber(BMP280_I2C_ADDR, NumberFormat.UInt8BE);
        return (msb << 12) | (lsb << 4) | (xlsb >> 4);
    }

    function calculateBMP280TemperatureFine(): number {
        let adc_T = get24BitRegister(0xFA);
        let var1 = (((adc_T >> 3) - (bmp280_calib_T1 << 1)) * bmp280_calib_T2) >> 11;
        let var2 = (((((adc_T >> 4) - bmp280_calib_T1) * ((adc_T >> 4) - bmp280_calib_T1)) / 2048) * bmp280_calib_T3) >> 14;
        return var1 + var2; // This value is used to calculate pressure
    }

    //% blockId="BMP280_POWER_ON" block="Power On Sensors"
    export function powerOnSensors(): void {
        writeBMP280Reg(0xF4, 0x2F); // Configuration for normal mode
        readBMP280CalibrationData(); // Read calibration data
        initializeAHT20(); // Initialize AHT20
    }

    //% blockId="BMP280_GET_PRESSURE" block="get pressure"
    export function getPressure(): number {
        let t_fine = calculateBMP280TemperatureFine();
        let adc_P = get24BitRegister(0xF7);
        let var1 = (t_fine / 2) - 64000;
        let var2 = (((var1 / 4) * (var1 / 4)) / 2048) * bmp280_calib_P6;
        var2 += ((var1 * bmp280_calib_P5) * 2);
        var2 = (var2 / 4) + (bmp280_calib_P4 * 65536);
        var1 = (((bmp280_calib_P3 * (((var1 / 4) * (var1 / 4)) / 8192)) / 8) + ((bmp280_calib_P2 * var1) / 2)) / 262144;
        var1 = ((32768 + var1) * bmp280_calib_P1) / 32768;
        if (var1 === 0) {
            return 0; // Avoid division by zero
        }
        let p = 1048576 - adc_P;
        p = ((p - (var2 / 4096)) * 3125);
        p = (p / var1) * 2;
        var1 = (bmp280_calib_P9 * (((p / 8) * (p / 8)) / 8192)) / 4096;
        var2 = ((p / 4) * bmp280_calib_P8) / 8192;
        p = p + ((var1 + var2 + bmp280_calib_P7) / 16);
        return p / 100; // Convert to hPa
    }

    //% blockId="BMP280_GET_TEMPERATURE" block="get BMP temperature"
    export function getTemperatureBMP(): number {
        let t_fine = calculateBMP280TemperatureFine();
        let T = (t_fine * 5 + 128) >> 8;
        return T / 100; // Convert to degrees Celsius
    }

    //% blockId="AHT20_GET_TEMPERATURE" block="get AHT temperature"
    export function getTemperatureAHT(): number {
        if (!initializeAHT20()) {
            return -999; // Return an error or invalid temperature if initialization fails
        }
        pins.i2cWriteNumber(AHT20_I2C_ADDR, 0xAC, NumberFormat.UInt8BE);
        basic.pause(80); // Wait for measurement to complete
        let rawData = pins.i2cReadBuffer(AHT20_I2C_ADDR, 6);
        let rawTemp = ((rawData[3] & 0x0F) << 16) | (rawData[4] << 8) | rawData[5];
        let temperature = ((rawTemp * 200.0) / 1048576.0) - 50.0; // Convert to Celsius
        return temperature;
    }

    //% blockId="AHT20_GET_HUMIDITY" block="get humidity"
    export function getHumidity(): number {
        if (!initializeAHT20()) {
            return -999; // Return an error or invalid humidity if initialization fails
        }
        pins.i2cWriteNumber(AHT20_I2C_ADDR, 0xAC, NumberFormat.UInt8BE);
        basic.pause(80); // Wait for measurement to complete
        let rawData = pins.i2cReadBuffer(AHT20_I2C_ADDR, 6);
        let rawHumidity = ((rawData[1] << 12) | (rawData[2] << 4) | (rawData[3] >> 4)) & 0xFFFF;
        let humidity = (rawHumidity * 100.0) / 1048576.0; // Convert to percentage
        return humidity;
    }

    // Helper function to initialize AHT20
    function initializeAHT20(): boolean {
        let status = pins.i2cReadNumber(AHT20_I2C_ADDR, NumberFormat.UInt8BE, true);
        if ((status & 0x68) !== 0) { // Check if sensor is not busy and is calibrated
            pins.i2cWriteBuffer(AHT20_I2C_ADDR, pins.createBufferFromArray([0xBE, 0x08, 0x00]));
            basic.pause(10); // Short pause after initialization
        }
        return true;
    }
}

