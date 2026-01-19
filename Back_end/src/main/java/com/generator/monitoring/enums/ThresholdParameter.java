package com.generator.monitoring.enums;

public enum ThresholdParameter {
    // 1. RPM
    RPM("RPM", "rpm"),

    // 2. Generator Frequency
    GENERATOR_FREQUENCY("Generator Frequency", "Hz"),

    // 3. Mains/Bus Frequency
    MAINS_BUS_FREQUENCY("Mains/Bus Frequency", "Hz"),

    // 4. Generator Voltage L-N (Line to Neutral)
    GENERATOR_VOLTAGE_LN("Generator Voltage L-N", "V"),

    // 5. Generator Voltage L-L (Line to Line)
    GENERATOR_VOLTAGE_LL("Generator Voltage L-L", "V"),

    // 6. Mains/Bus Voltage L-N (Line to Neutral)
    MAINS_BUS_VOLTAGE_LN("Mains/Bus Voltage L-N", "V"),

    // 7. Mains/Bus Voltage L-L (Line to Line)
    MAINS_BUS_VOLTAGE_LL("Mains/Bus Voltage L-L", "V"),

    // 8. Generator Current (All three phases)
    GENERATOR_CURRENT("Generator Current", "A"),

    // 9. Real Power (Generator P, Load P)
    REAL_POWER("Real Power (P)", "kW"),

    // 10. Reactive Power (Generator Q, Load Q)
    REACTIVE_POWER("Reactive Power (Q)", "kVAr"),

    // 11. Power Factor (Generator PF, Mains PF, Load PF)
    POWER_FACTOR("Power Factor", ""),

    // 12. Earth Fault Current
    EARTH_FAULT_CURRENT("Earth Fault Current", "A"),

    // 13. ROCOF (Rate of Change of Frequency)
    ROCOF("ROCOF", "Hz/s"),

    // 14. Oil Pressure
    OIL_PRESSURE("Oil Pressure", "Bar"),

    // 15. Oil Temperature
    OIL_TEMPERATURE("Oil Temperature", "°C"),

    // 16. Fuel Level
    FUEL_LEVEL("Fuel Level", "%"),

    // 17. Battery Voltage (Battery Volts, D+)
    BATTERY_VOLTAGE("Battery Voltage", "V"),

    // 18. E-STOP (Emergency Stop)
    E_STOP("E-STOP", "");

    private final String displayName;
    private final String unit;

    ThresholdParameter(String displayName, String unit) {
        this.displayName = displayName;
        this.unit = unit;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getUnit() {
        return unit;
    }
}
