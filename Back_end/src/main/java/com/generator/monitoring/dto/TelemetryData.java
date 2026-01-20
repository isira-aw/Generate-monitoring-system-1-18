package com.generator.monitoring.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TelemetryData {
    private String deviceId;
    private LocalDateTime timestamp;

    // RPM
    @JsonProperty("RPM")
    private Double rpm;

    // Generator Power (Real Power)
    @JsonProperty("Generator_P_L1")
    private Double generatorPL1;
    @JsonProperty("Generator_P_L2")
    private Double generatorPL2;
    @JsonProperty("Generator_P_L3")
    private Double generatorPL3;

    // Generator Reactive Power
    @JsonProperty("Generator_Q")
    private Double generatorQ;
    @JsonProperty("Generator_Q_L1")
    private Double generatorQL1;
    @JsonProperty("Generator_Q_L2")
    private Double generatorQL2;
    @JsonProperty("Generator_Q_L3")
    private Double generatorQL3;

    // Generator Apparent Power
    @JsonProperty("Generator_S")
    private Double generatorS;
    @JsonProperty("Generator_S_L1")
    private Double generatorSL1;
    @JsonProperty("Generator_S_L2")
    private Double generatorSL2;
    @JsonProperty("Generator_S_L3")
    private Double generatorSL3;

    // Generator Power Factor
    @JsonProperty("Generator_Power_Factor")
    private Double generatorPowerFactor;

    // Generator Frequency
    @JsonProperty("Generator_Frequency")
    private Double generatorFrequency;

    // Generator Voltage (Line to Neutral)
    @JsonProperty("Generator_Voltage_L1_N")
    private Double generatorVoltageL1N;
    @JsonProperty("Generator_Voltage_L2_N")
    private Double generatorVoltageL2N;
    @JsonProperty("Generator_Voltage_L3_N")
    private Double generatorVoltageL3N;

    // Generator Voltage (Line to Line)
    @JsonProperty("Generator_Voltage_L1_L2")
    private Double generatorVoltageL1L2;
    @JsonProperty("Generator_Voltage_L2_L3")
    private Double generatorVoltageL2L3;
    @JsonProperty("Generator_Voltage_L3_L1")
    private Double generatorVoltageL3L1;

    // Generator Current
    @JsonProperty("Generator_Current_L1")
    private Double generatorCurrentL1;
    @JsonProperty("Generator_Current_L2")
    private Double generatorCurrentL2;
    @JsonProperty("Generator_Current_L3")
    private Double generatorCurrentL3;

    // Earth Fault Current
    @JsonProperty("Earth_Fault_Current")
    private Double earthFaultCurrent;

    // Mains/Bus Frequency
    @JsonProperty("Mains_Bus_Frequency")
    private Double mainsBusFrequency;

    // Mains/Bus Voltage (Line to Neutral)
    @JsonProperty("Mains_Bus_Voltage_L1_N")
    private Double mainsBusVoltageL1N;
    @JsonProperty("Mains_Bus_Voltage_L2_N")
    private Double mainsBusVoltageL2N;
    @JsonProperty("Mains_Bus_Voltage_L3_N")
    private Double mainsBusVoltageL3N;

    // Mains/Bus Voltage (Line to Line)
    @JsonProperty("Mains_Bus_Voltage_L1_L2")
    private Double mainsBusVoltageL1L2;
    @JsonProperty("Mains_Bus_Voltage_L2_L3")
    private Double mainsBusVoltageL2L3;
    @JsonProperty("Mains_Bus_Voltage_L3_L1")
    private Double mainsBusVoltageL3L1;

    // Mains Current
    @JsonProperty("Mains_L1_Current")
    private Double mainsL1Current;

    // Mains Import
    @JsonProperty("Mains_Import_P")
    private Double mainsImportP;
    @JsonProperty("Mains_Import_Q")
    private Double mainsImportQ;

    // Mains Power Factor
    @JsonProperty("Mains_PF")
    private Double mainsPF;

    // Vector Shift and ROCOF
    @JsonProperty("Max_Vector_Shift")
    private Double maxVectorShift;
    @JsonProperty("ROCOF")
    private Double rocof;
    @JsonProperty("Max_ROCOF")
    private Double maxRocof;

    // Load
    @JsonProperty("Load_P")
    private Double loadP;
    @JsonProperty("Load_Q")
    private Double loadQ;
    @JsonProperty("Load_PF")
    private Double loadPF;

    // Battery and D+
    @JsonProperty("Battery_Volts")
    private Double batteryVolts;
    @JsonProperty("D_Plus")
    private Double dPlus;

    // Oil
    @JsonProperty("Oil_Pressure")
    private Double oilPressure;
    @JsonProperty("Oil_Temperature")
    private Double oilTemperature;

    // Fuel Level
    @JsonProperty("Fuel_Level")
    private Double fuelLevel;

    // E-STOP (Binary)
    @JsonProperty("E_STOP")
    private Boolean eStop;

    // Alarm string from device
    @JsonProperty("Alarm")
    private String alarm;

    // Device alarms list (for compatibility)
    @JsonProperty("device_alarms")
    private List<String> deviceAlarms;

    // Backward compatibility setters for old MQTT format
    // These methods map old field names to new structure

    @JsonProperty("voltage")
    public void setVoltage(Double voltage) {
        // Map old 'voltage' to Generator Voltage L1-N
        this.generatorVoltageL1N = voltage;
    }

    @JsonProperty("current")
    public void setCurrent(Double current) {
        // Map old 'current' to Generator Current L1
        this.generatorCurrentL1 = current;
    }

    @JsonProperty("frequency")
    public void setFrequency(Double frequency) {
        // Map old 'frequency' to Generator Frequency
        this.generatorFrequency = frequency;
    }

    @JsonProperty("power")
    public void setPower(Double power) {
        // Map old 'power' to Generator P L1
        this.generatorPL1 = power;
    }

    @JsonProperty("temperature")
    public void setTemperature(Double temperature) {
        // Map old 'temperature' to Oil Temperature
        this.oilTemperature = temperature;
    }
}
