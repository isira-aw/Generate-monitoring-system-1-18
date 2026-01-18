package com.generator.monitoring.enums;

public enum ThresholdParameter {
    VOLTAGE("Voltage", "V"),
    CURRENT("Current", "A"),
    FREQUENCY("Frequency", "Hz"),
    POWER("Power", "kW"),
    TEMPERATURE("Temperature", "°C"),
    FUEL_LEVEL("Fuel Level", "%"),
    OIL_PRESSURE("Oil Pressure", "PSI"),
    RPM("RPM", "rpm");

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
