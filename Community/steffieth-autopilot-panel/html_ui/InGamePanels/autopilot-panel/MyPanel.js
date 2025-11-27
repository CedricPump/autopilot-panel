// --- Fallback Autopilot (PID) as internal state will be in MyPanel constructor ---

class MyPanel extends TemplateElement {
    constructor() {
        super(...arguments);
        // --- Fallback Autopilot (PID) as internal state ---
        this.controlModes = [
            { label: 'aileron trim, elevator trim', key: 'trim' },
            { label: 'aileron, elevator', key: 'aileron' },
            { label: 'rudder trim, elevator trim', key: 'rudder' }
        ];
        this.controlModeIndex = 0;
        this.bankKp = 0.095;
        this.bankKi = 0.0;
        this.bankKd = 0.009;
        this.vsKp = 0.00011;
        this.vsKi = 0.0;
        this.vsKd = 0.00027;
        this.pitchKp = 0.095;
        this.pitchKi = 0.0;
        this.pitchKd = 0.009;
        this._bankIntegral = 0;
        this._bankLastError = 0;
        this._vsIntegral = 0;
        this._vsLastError = 0;
        this._pitchIntegral = 0;
        this._pitchLastError = 0;
        this._lastTime = null;
        this.targetBank = 0;
        this.targetVS = 0;
        this.targetPitch
        this.apTextLabel = null;
        this.debugEnabled = true;
        this.txtDebugLog = null;
        this.txtDebugLogLabel = null;
        this.autopilotMaster = false;
        this.useCustomAutopilotLogic = false;

        // init selcetion states
        this.selectedHeadingBug = 0;
        this.SelectedVS = 0;
        this.SelectedRoll = 0;
        this.SelectedPitch = 0;
        this.selecterdAltitude = 0;

        this.buttonStateMap = [
            { button: "btnAP", state: () => this.autopilotMaster },
            { button: "btnALTsel", state: () => this.altStepModifier },
            { button: "btnHDG", state: () => this.isHeadingHold },
            { button: "btnALT", state: () => this.isAltitudeHold },
            { button: "btnNAV", state: () => this.isNavActive },
            { button: "btnAPR", state: () => this.APRHold },
            { button: "btnVS", state: () => this.isVSHold || this.isPITHold },
            { button: "btnIAS", state: () => this.isFLCActive },
            { button: "btnLVL", state: () => this.wingsLevelActive },
            { button: "btnROL", state: () => this.isRollHold },
        ];


        this.initialize();
    }

    connectedCallback() {
        super.connectedCallback();
        this.initialize();
    }

    initialize() {
        if (this.started) return;
        this._initDebugLog();
        try {
            //this.log("Initializing MyPanel...");
            this.version = "v1.0.7";
            this.ingameUi = this.querySelector("ingame-ui");

            this._initButtonVars();
            this._initButtonListeners();

            // Start ui loop
            setInterval(() => this.update(), 250);

            // Start state retrieval loop
            setInterval(() => this.getStates(), 39);

            // Start autopilot logic loop
            setInterval(() => this.updateFallbackAutopilot(), 80);
            this._hideDebugLog();
        } catch (e) {
            this.log(`Error in initialize: ${e}`, "ERROR");
        };
        this.started = true;
    }

    _initButtonVars() {
        // Assign all button/querySelector variables
        try {
            this.txtDebugLog = this.querySelector('#txt-debug-log');
            this.txtDebugLogLabel = this.querySelector('#debug-log-label');
            this.btnHDG = this.querySelector('#btnHDG');
            this.btnNAV = this.querySelector('#btnNAV');
            this.btnAPR = this.querySelector('#btnAPR');
            this.btnAP = this.querySelector('#btnAP');
            this.btnLVL = this.querySelector('#btnLVL');
            this.btnFD = this.querySelector('#btnFD');
            this.btnYD = this.querySelector('#btnYD');
            this.btnVSinc = this.querySelector('#btnVSinc');
            this.btnVSdec = this.querySelector('#btnVSdec');
            this.btnIAS = this.querySelector('#btnIAS');
            this.btnVS = this.querySelector('#btnVS');
            this.btnALT = this.querySelector('#btnALT');
            this.btnVNV = this.querySelector('#btnVNV');
            this.btnHDGBug = this.querySelector('#btnHDGBug');
            this.btnALTsel = this.querySelector('#btnALTSel');
            this.btnROL = this.querySelector('#btnROL');
            this.btnALTinc = this.querySelector('#btnALTinc');
            this.btnALTdec = this.querySelector('#btnALTdec');
            this.btnHDGinc = this.querySelector('#btnHDGinc');
            this.btnHDGdec = this.querySelector('#btnHDGdec');
            this.apTextLabel = this.querySelector('#ap-text-label');
            this.btnExperimental = this.querySelector('.btn-experimental');
            this.btnControls = this.querySelector('.btn-controls');
        } catch (e) {
            this.log(`Error in _initButtonVars: ${e}`, "ERROR");
        }
    }

    _initButtonListeners() {
        // Add event listeners for all buttons
        if (this.btnHDG) this.btnHDG.addEventListener("click", () => this.onHDGClicked());
        if (this.btnNAV) this.btnNAV.addEventListener("click", () => this.onNAVClicked());
        if (this.btnAPR) this.btnAPR.addEventListener("click", () => this.onAPRClicked());
        if (this.btnAP) this.btnAP.addEventListener("click", () => this.onAPClicked());
        if (this.btnLVL) this.btnLVL.addEventListener("click", () => this.onLVLClicked());
        if (this.btnFD) this.btnFD.addEventListener("click", () => this.onFDClicked());
        if (this.btnYD) this.btnYD.addEventListener("click", () => this.onYDClicked());
        if (this.btnVSinc) {
            this.btnVSinc.addEventListener("click", () => this.onVSincClicked());
            this.btnVSinc.addEventListener("wheel", (event) => {
                this.log(`deltaY: ${event.deltaY}`);
                if (event.deltaY < 0) this.onVSincClicked(); else this.onVSdecClicked();
            });
        }
        if (this.btnVSdec) {
            this.btnVSdec.addEventListener("click", () => this.onVSdecClicked());
            this.btnVSdec.addEventListener("wheel", (event) => {
                this.log(`deltaY: ${event.deltaY}`);
                if (event.deltaY < 0) this.onVSincClicked(); else this.onVSdecClicked();
            });
        }
        if (this.btnIAS) {
            this.btnIAS.addEventListener("click", () => this.onIASClicked());
            this.btnIAS.addEventListener("wheel", (event) => {
                this.log(`deltaY: ${event.deltaY}`);
                if (event.deltaY < 0) this.onVSincClicked(); else this.onVSdecClicked();
            });
        }
        if (this.btnVS) {
            this.btnVS.addEventListener("click", () => this.onVSClicked());
            this.btnVS.addEventListener("wheel", (event) => {
                this.log(`deltaY: ${event.deltaY}`);
                if (event.deltaY < 0) this.onVSincClicked(); else this.onVSdecClicked();
            });
        }
        if (this.btnALT) this.btnALT.addEventListener("click", () => this.onALTClicked());
        if (this.btnVNV) this.btnVNV.addEventListener("click", () => this.onVNVClicked());
        if (this.btnHDGBug) {
            this.btnHDGBug.addEventListener("click", () => this.onHDGBugClicked());
            this.btnHDGBug.addEventListener("wheel", (event) => {
                this.log(`deltaY: ${event.deltaY}`);
                if (event.deltaY < 0) this.onHDGBugInc(); else this.onHDGBugDec();
            });
        }
        if (this.btnALTsel) {
            this.altStepModifier = false;
            this.btnALTsel.addEventListener("click", () => this.onALTselClicked());
            this.btnALTsel.addEventListener("wheel", (event) => {
                event.preventDefault();
                const step = this.altStepModifier ? 1000 : 100;
                this.log(`deltaY: ${event.deltaY}, modifier: ${this.altStepModifier}, step: ${step}`);
                if (event.deltaY < 0) this.onALTselInc(step); else this.onALTselDec(step);
            });
        }
        if (this.btnROL) {
            this.btnROL.addEventListener("click", () => this.onROLselClicked());
            this.btnROL.addEventListener("wheel", (event) => {
                this.log(`deltaY: ${event.deltaY}`);
                if (event.deltaY > 0) this.onROLInc(); else this.onROLDec();
            });
        }
        if (this.btnALTinc) this.btnALTinc.addEventListener("click", (ev) => this.onALTselInc(ev && ev.shiftKey ? 1000 : 100));
        if (this.btnALTdec) this.btnALTdec.addEventListener("click", (ev) => this.onALTselDec(ev && ev.shiftKey ? 1000 : 100));
        if (this.btnHDGinc) this.btnHDGinc.addEventListener("click", () => this.onHDGBugInc());
        if (this.btnHDGdec) this.btnHDGdec.addEventListener("click", () => this.onHDGBugDec());
        if (this.btnExperimental) this.btnExperimental.addEventListener("click", () => this.onBtnExperimentalClicked());
        if (this.btnControls) this.btnControls.addEventListener("click", () => this.onControlsClicked());

    }

    _initDebugLog() {
        // Triple-click on ap-text-label to toggle debug mode
        if (this.apTextLabel) {
            let clickCount = 0;
            let clickTimer = null;
            this.apTextLabel.addEventListener('click', () => {
                clickCount++;
                if (clickCount === 1) {
                    clickTimer = setTimeout(() => { clickCount = 0; }, 1200);
                }
                if (clickCount === 3) {
                    clearTimeout(clickTimer);
                    clickCount = 0;
                    this.debugEnabled = !this.debugEnabled;
                    if (this.txtDebugLog) this.txtDebugLog.style.display = this.debugEnabled ? "block" : "none";
                    if (this.txtDebugLogLabel) this.txtDebugLogLabel.style.display = this.debugEnabled ? "block" : "none";
                    this.log(`DEBUG MODE ${this.debugEnabled ? 'ON' : 'OFF'}`);
                }
            });
        }

    }

    _hideDebugLog() {
        // Hide debug log if debug flag is false
        this.debugEnabled = false;
        if (!this.debugEnabled && this.txtDebugLog) {
            this.txtDebugLog.style.display = "none";
            this.txtDebugLogLabel.style.display = "none";
        }
    }

    updateAltSelIndicator() {
        if (this.altStepModifier) {
            this.btnALTsel.classList.add("active");
        } else {
            this.btnALTsel.classList.remove("active");
        }
    }

    log(msg = "", level = "DEBUG") {
        if (!this.debugEnabled || !this.txtDebugLog) return;
        // also send to dev console for visibility
        try { console.log(msg); } catch (e) { }
        // append text (convert objects/events to readable string)
        let s;
        if (typeof msg === 'string') s = msg;
        else if (msg && msg.message) s = msg.message;
        else {
            try { s = JSON.stringify(msg); } catch (e) { s = String(msg); }
        }
        this.txtDebugLog.value = (this.txtDebugLog.value ? this.txtDebugLog.value + '\r\n' : '') + "[" + level.toUpperCase() + "] " + s;
        this.txtDebugLog.scrollTop = this.txtDebugLog.scrollHeight;
    }

    writePanelText(text) {
        if (!this.apTextLabel) return;
        // convert newlines to <br> for display and use innerHTML to render them
        let html = text.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');
        this.apTextLabel.innerHTML = html;
    }

    update() {
        try {
            this.setAPPanelText();
            this.updateHDGIndicator();
            this.updateButtonStates();
            this.updateDebugLogVisibility();
        } catch (e) {
            this.log(`Error in update: ${e}`, "ERROR");
        }
    }

    updateFallbackAutopilot() {
        // Fallback autopilot logic (only if not autopilotAvailable)
        // Use 'this.controlMode' and fallback PID methods
        if (!this.useCustomAutopilotLogic || !this.autopilotMaster) return;
        let res = { elevator: 0, aileron: 0 };
        let elevatorTrimPercent = 0;
        let aileronTrimPercent = 0;
        res = this.fallbackCalculate(this.CurrentRoll, this.CurrentVS, this.CurrentPitch);
        elevatorTrimPercent = Math.round(res.elevator * 100);
        aileronTrimPercent = Math.round(res.aileron * 100);
        this.log(`Fallback control output VS: ${this.isVSHold}, ROL: ${this.isRollHold}\n  aileron: ${aileronTrimPercent}, elevator: ${elevatorTrimPercent}\n  roll: ${this.CurrentRoll.toFixed(4)}, vs: ${this.CurrentVS.toFixed(4)} fpm`);
        const modeKey = this.controlModes[this.controlModeIndex].key;
        if (modeKey === 'aileron') {
            if (this.isRollHold) {
                SimVar.SetSimVarValue("AILERON POSITION", "Position", res.aileron);
            }
            if (this.isVSHold || this.isPITHold) {
                SimVar.SetSimVarValue("ELEVATOR POSITION", "Position", res.elevator);
            }
        }
        else if (modeKey === 'trim') {
            if (this.isRollHold) {
                SimVar.SetSimVarValue("AILERON TRIM PCT", "	Percent Over 100", res.aileron);
            }
            if (this.isVSHold || this.isPITHold) {
                SimVar.SetSimVarValue("ELEVATOR TRIM POSITION", "Radians", res.elevator * 0.44);
            }
        }
        else if (modeKey === 'rudder') {
            if (this.isRollHold) {
                SimVar.SetSimVarValue("RUDDER TRIM PCT", "Percent Over 100", res.aileron);
            }
            if (this.isVSHold || this.isPITHold) {
                SimVar.SetSimVarValue("ELEVATOR TRIM PCT", "Percent Over 100", res.elevator);
            }
        }

    }

    fallbackCalculate(currentBank, currentVS, currentPitch) {
        let elevator = 0;
        let aileron = 0;
        // return { elevator, aileron };

        try {
            if (this._lastTime === null) {
                this._lastTime = performance.now() / 1000;
            }
            const now = performance.now() / 1000;
            let dt = now - this._lastTime;
            this._lastTime = now;
            if (dt <= 0) dt = 0.0001;
            // --- Bank ➜ Aileron ---
            const bankError = this.targetBank - currentBank;
            this._bankIntegral += bankError * dt;
            const bankDerivative = (bankError - this._bankLastError) / dt;
            this._bankLastError = bankError;
            aileron = (this.bankKp * bankError) + (this.bankKi * this._bankIntegral) + (this.bankKd * bankDerivative);
            aileron = Math.max(-1, Math.min(1, aileron));
            if (this.isVSHold) {
                // --- VS ➜ Elevator ---
                const vsError = this.targetVS - currentVS;
                this._vsIntegral += vsError * dt;
                const vsDerivative = (vsError - this._vsLastError) / dt;
                this._vsLastError = vsError;
                elevator = (this.vsKp * vsError) + (this.vsKi * this._vsIntegral) + (this.vsKd * vsDerivative);
                elevator = Math.max(-1, Math.min(1, elevator));
            } else if (this.isPITHold) {
                // --- PITCH ➜ Elevator ---
                const pitchError = this.targetPitch - currentPitch;
                this._pitchIntegral += pitchError * dt;
                const pitchDerivative = (pitchError - this._pitchLastError) / dt;
                this._pitchLastError = pitchError;
                elevator = (this.pitchKp * pitchError) + (this.pitchKi * this._pitchIntegral) + (this.pitchKd * pitchDerivative);
                elevator = -Math.max(-1, Math.min(1, elevator));
            }
        } catch (e) {
            this.autopilotMaster = false;
            this.log(`Error in fallbackCalculate: ${e}`, "ERROR");
        }
        return { elevator: elevator, aileron: -aileron };
    }

    updateDebugLogVisibility() {
        // Hide debug log if debug flag is false
        if (!this.debugEnabled && this.txtDebugLog) {
            this.txtDebugLog.style.display = "none";
            this.txtDebugLogLabel.style.display = "none";
        } else {
            // unhide
            this.txtDebugLog.style.display = "block";
            this.txtDebugLogLabel.style.display = "block";
        }
    }

    updateButtonStates() {
        // List all button property names to ensure all are handled for disabling
        const allButtons = [
            "btnAP", "btnALTsel", "btnHDG", "btnALT", "btnNAV", "btnAPR", "btnVS", "btnIAS", "btnLVL", "btnROL",
            "btnFD", "btnYD", "btnVSinc", "btnVSdec", "btnALTinc", "btnALTdec", "btnHDGBug", "btnHDGinc", "btnHDGdec", "btnVNV", "btnExperimental"
        ];
        const customEnabled = ["btnAP", "btnROL", "btnVS", "btnLVL"];

        // Activation state (only for those in buttonStateMap)
        if (this.buttonStateMap) {
            for (const entry of this.buttonStateMap) {
                const btn = this[entry.button];
                if (!btn) continue;
                const active = !!entry.state();
                if (active) {
                    btn.setAttribute("activated", "true");
                } else {
                    btn.removeAttribute("activated");
                }
            }
        }

        // Disabled state (for all known buttons)
        for (const btnName of allButtons) {
            const btn = this[btnName];
            if (!btn) continue;
            if (this.useCustomAutopilotLogic) {
                if (customEnabled.includes(btnName)) {
                    btn.removeAttribute("disabled");
                } else {
                    btn.setAttribute("disabled", "true");
                }
            } else {
                btn.removeAttribute("disabled");
            }
        }

        if (this.btnControls) this.updateControlsButtonLabel();
    }

    updateHDGIndicator() {
        this.btnHDGBug.title = `${Math.round(this.selectedHeadingBug)}`;
        this.btnHDGBug.innerHTML = `${Math.round(this.selectedHeadingBug)}`;

        // Update heading indicator rotation
        if (this.btnHDGBug) {
            const hdgIndicator = document.getElementById('hdg-indicator');
            if (hdgIndicator) {
                // Calculate relative heading: how many degrees the bug is ahead of current heading
                let relativeHeading = this.selectedHeadingBug - this.CurrentHeading;
                // Handle 360-degree wrap-around
                while (relativeHeading > 180) relativeHeading -= 360;
                while (relativeHeading < -180) relativeHeading += 360;
                // Apply rotation to the indicator
                hdgIndicator.style.transform = `rotate(${relativeHeading}deg)`;
            }
        }
    }

    setAPPanelText() {
        const COL_AP = 6;
        const COL_MODE = 6;
        const COL_ALT = 6;
        const COL_NUM = 10;
        const PAD_CHAR = " ";

        // RIGHT-aligned, no internal spaces
        const fmt = (num, width = 6) =>
            `${Math.round(num)}`.padStart(width, PAD_CHAR);

        // right aligned ##0.00 with two decimals
        const fmt2 = (num, width = 6) => {
            let s = num.toFixed(2);
            return s.padStart(width, PAD_CHAR);
        };

        if (!this.autopilotAvailable && !this.useCustomAutopilotLogic) {
            this.writePanelText("UNAVAILABLE<br> ");
            return;
        }

        if (this.useCustomAutopilotLogic) {
            let line1 = (this.autopilotMaster ? "AP " : "   ") + "Experimental";

            let line2 = "   ";
            if (this.isRollHold)
                line2 += "ROL " + fmt2(-this.SelectedRoll, 4).padEnd(8, PAD_CHAR);
            if (this.isVSHold)
                line2 += "   VS" + fmt(this.SelectedVS, 5);
            if (this.isPITHold)
                line2 += "  PIT" + fmt2(this.SelectedPitch, 5);

            this.writePanelText(line1 + "<br>" + line2);
            return;
        }

        if (!this.autopilotMaster) {
            this.writePanelText("Off<br> ");
            return;
        }

        let line1 = "";
        let line2 = "";

        // ===== LINE 1 =====
        line1 += "AP".padEnd(COL_AP, PAD_CHAR);
        // -- Lat MODE --
        if (this.wingsLevelActive)
            line1 += "LVL".padEnd(COL_MODE, PAD_CHAR);
        else if (this.APRHold && this.APRActive)
            line1 += (this.IsLocalizerHold ? "LOC" : "APR").padEnd(COL_MODE, PAD_CHAR);
        else if (this.isNavActive)
            line1 += "NAV".padEnd(COL_MODE, PAD_CHAR);
        else if (this.isHeadingHold)
            line1 += "HDG".padEnd(COL_MODE, PAD_CHAR);
        else if (this.isRollHold)
            line1 += "ROL".padEnd(COL_MODE, PAD_CHAR);
        else
            line1 += "".padEnd(COL_MODE, PAD_CHAR);
        // -- ALT (vert Mode) --
        // if (this.wingsLevelActive)
        //     line1 += "LVL".padEnd(COL_ALT, PAD_CHAR);
        if (this.GSHold && this.GSActive)
            line1 += "GS".padEnd(COL_ALT, PAD_CHAR);
        else if (this.isFLCActive)
            line1 += ("FLC").padEnd(COL_ALT, PAD_CHAR)
        else if (this.isVSHold)
            line1 += ("VS").padEnd(COL_ALT, PAD_CHAR)
        else if (this.isAltitudeHold || this.isAltitudeArmed)
            line1 += "ALT".padEnd(COL_ALT, PAD_CHAR);
        else
            line1 += "".padEnd(COL_ALT, PAD_CHAR);
        // -- NUM --
        line1 += `${fmt(this.selecterdAltitude)} ft `.padEnd(COL_NUM, PAD_CHAR);

        // ===== LINE 2 =====
        line2 += "".padEnd(COL_AP, PAD_CHAR);
        // -- Lat MODE --
        if (this.APRActive)
            line2 += (this.IsLocalizerHold ? "LOC" : "APR").padEnd(COL_MODE, PAD_CHAR);
        else
            line2 += "".padEnd(COL_MODE, PAD_CHAR);
        // -- ALT --
        if (this.GSHold && !this.GSActive)
            line2 += "GS".padEnd(COL_ALT + 1, PAD_CHAR);
        else if ((this.isFLCActive || this.isVSHold) && this.isAltitudeArmed)
            line2 += ("ALT").padEnd(COL_ALT, PAD_CHAR);
        else
            line2 += "".padEnd(COL_ALT, PAD_CHAR);
        // -- NUM --
        if (this.isFLCActive)
            line2 += `${fmt(this.selectedIAS)} kt `.padEnd(COL_NUM, PAD_CHAR);
        else if (this.isVSHold)
            line2 += `${fmt(this.SelectedVS)} fpm`.padEnd(COL_NUM, PAD_CHAR);



        this.writePanelText(line1 + "<br>" + line2);
    }



    // --- SIMVAR COLLECTION ---
    getStates() {
        try {
            // AP
            this.autopilotAvailable = SimVar.GetSimVarValue("AUTOPILOT AVAILABLE", "Bool") > 0;
            // this.log(`Autopilot Available: ${this.autopilotAvailable}`);
            this.CurrentRoll = SimVar.GetSimVarValue("PLANE BANK DEGREES", "degrees");
            this.CurrentVS = SimVar.GetSimVarValue("VERTICAL SPEED", "feet per minute");
            this.CurrentHeading = SimVar.GetSimVarValue("PLANE HEADING DEGREES MAGNETIC", "degrees");
            this.CurrentAltitude = SimVar.GetSimVarValue("PLANE ALTITUDE", "feet");
            this.CurrentAirspeed = SimVar.GetSimVarValue("AIRSPEED INDICATED", "knots");
            this.CurrentPitch = SimVar.GetSimVarValue("PLANE PITCH DEGREES", "degrees");

            if (this.useCustomAutopilotLogic) {
                // do not overwrite states if using custom autopilot logic
                return;
            }
            this.autopilotMaster = SimVar.GetSimVarValue("AUTOPILOT MASTER", "Bool") > 0;
            // ALT
            this.selecterdAltitude = SimVar.GetSimVarValue("AUTOPILOT ALTITUDE LOCK VAR", "feet");
            this.isAltitudeHold = SimVar.GetSimVarValue("AUTOPILOT ALTITUDE LOCK", "Bool") > 0;
            this.isAltitudeArmed = SimVar.GetSimVarValue("AUTOPILOT ALTITUDE ARM", "Bool") > 0;
            // HDG
            this.isHeadingHold = SimVar.GetSimVarValue("AUTOPILOT HEADING LOCK", "Bool") > 0;
            this.selectedHeadingBug = SimVar.GetSimVarValue("AUTOPILOT HEADING LOCK DIR", "degrees");
            // LVL / ROL
            this.isRollHold = SimVar.GetSimVarValue("AUTOPILOT BANK HOLD", "Bool") > 0;
            this.SelectedRoll = SimVar.GetSimVarValue("AUTOPILOT BANK HOLD REF", "Bool") > 0;
            this.wingsLevelActive = SimVar.GetSimVarValue("AUTOPILOT WING LEVELER", "Bool") > 0;
            // VS
            this.isVSHold = SimVar.GetSimVarValue("AUTOPILOT VERTICAL HOLD", "Bool") > 0;
            this.SelectedVS = SimVar.GetSimVarValue("AUTOPILOT VERTICAL HOLD VAR", "feet per minute");

            // Airspeed / IAS / FLC
            this.selectedIAS = SimVar.GetSimVarValue("AUTOPILOT AIRSPEED HOLD VAR", "knots");
            this.isFLCActive = SimVar.GetSimVarValue("AUTOPILOT FLIGHT LEVEL CHANGE", "Bool") > 0;
            // NAV
            this.isNavActive = SimVar.GetSimVarValue("AUTOPILOT NAV1 LOCK", "Bool") > 0;
            // APR
            this.APRArmed = SimVar.GetSimVarValue("AUTOPILOT APPROACH ARM", "Bool") > 0;
            this.APRActive = SimVar.GetSimVarValue("AUTOPILOT APPROACH ACTIVE", "Bool") > 0;
            this.APRHold = SimVar.GetSimVarValue("AUTOPILOT APPROACH HOLD", "Bool") > 0;
            this.IsLocalizerHold = SimVar.GetSimVarValue("AUTOPILOT APPROACH IS LOCALIZER", "Bool") > 0;
            // GS
            this.GSArmed = SimVar.GetSimVarValue("AUTOPILOT GLIDESLOPE ARM", "Bool") > 0;
            this.GSHold = SimVar.GetSimVarValue("AUTOPILOT GLIDESLOPE HOLD", "Bool") > 0;
            this.GSActive = SimVar.GetSimVarValue("AUTOPILOT GLIDESLOPE ACTIVE", "Bool") > 0;
        } catch (e) {
            this.log(`Error in getStates: ${e}`);
        }
    }



    // heading bug
    onHDGBugClicked() {
        // sync heading bug with current heading
        SimVar.SetSimVarValue("K:HEADING_BUG_SET", "degrees", this.CurrentHeading);
        this.selectedHeadingBug = this.CurrentHeading;
        this.log(`HDG Bug synced to current heading: ${this.CurrentHeading}`);
    }
    onHDGBugInc() {
        // SimVar.SetSimVarValue("K:HEADING_BUG_INC", "number", 0);
        SimVar.SetSimVarValue("K:HEADING_BUG_SET", "degrees", this.selectedHeadingBug + 1);
        this.selectedHeadingBug++;
        this.log(`HDG Bug increased: ${this.selectedHeadingBug}`);
    }
    onHDGBugDec() {
        // SimVar.SetSimVarValue("K:HEADING_BUG_DEC", "number", 0);
        SimVar.SetSimVarValue("K:HEADING_BUG_SET", "degrees", this.selectedHeadingBug - 1);
        this.selectedHeadingBug--;
        this.log(`HDG Bug decreased: ${this.selectedHeadingBug}`);;
    }

    // right side
    onHDGClicked() {
        let lastHeading = this.selectedHeadingBug;
        SimVar.SetSimVarValue("K:AP_HDG_HOLD", "bool", true);
        SimVar.SetSimVarValue("K:HEADING_BUG_SET", "degrees", lastHeading);
        this.log("HDG button pressed");
    }

    onNAVClicked() {
        SimVar.SetSimVarValue("K:AP_NAV1_HOLD", "Bool", 1);
        this.log("NAV button pressed");
    }

    onAPRClicked() {
        SimVar.SetSimVarValue("K:AP_APR_HOLD", "Bool", 1);
        this.log("APR button pressed");
    }

    // center
    onAPClicked() {
        SimVar.SetSimVarValue("K:AP_MASTER", "Bool", this.autopilotMaster ? 0 : 1);
        this.autopilotMaster = !this.autopilotMaster;
        if (this.useCustomAutopilotLogic && !this.autopilotMaster) {
            this.isRollHold = false;
            this.isVSHold = false;
            this.isPITHold = false;
        }
        this.log(`AP Master toggled to ${!this.autopilotMaster ? "OFF" : "ON"}`);
    }

    onLVLClicked() {
        if (!this.autopilotMaster) this.onAPClicked();
        SimVar.SetSimVarValue("K:AP_WING_LEVELER", "Bool", 1);
        SimVar.SetSimVarValue("K:AP_PITCH_LEVELER", "Bool", 1);
        if (this.useCustomAutopilotLogic) {
            this.SelectedVS = 0;
            this.SelectedPitch = 0;
            this.SelectedRoll = 0;
            this.fallbackSetTargetBank(0, true);
            this.fallbackSetTargetVS(0, true);
            this.isRollHold = true;
            this.isVSHold = false;
            this.isPITHold = true;
        }
        this.log("LVL button pressed");
    }

    onFDClicked() {
        SimVar.SetSimVarValue("K:TOGGLE_FLIGHT_DIRECTOR", "Bool", 1);
        this.log("FD button pressed");
    }

    onYDClicked() {
        SimVar.SetSimVarValue("K:TOGGLE_YAW_DAMPER", "Bool", 1);
        this.log("YD button pressed");
    }



    onIASClicked() {
        // SimVar.SetSimVarValue("K:AP_IAS_HOLD", "Bool", 1);
        SimVar.SetSimVarValue("K:FLIGHT_LEVEL_CHANGE", "Bool", 1);
        this.selectedIAS = this.CurrentAirspeed;
        this.SetSimVarValue("AUTOPILOT AIRSPEED LOCK VAR", "knots", this.selectedIAS);
        this.log("IAS button pressed");
    }

    onVSClicked() {
        if (!this.useCustomAutopilotLogic) {
            this.isVSHold = !this.isVSHold;
            SimVar.SetSimVarValue("K:AP_VS_HOLD", "Bool", 1);
            this.log("VS button pressed");
            return;
        }

        // if OFF switch to PIT
        if (!this.isVSHold && !this.isPITHold) {
            // switch to pitch hold
            this.isPITHold = true;
            this.isVSHold = false;
            this.SelectedPitch = Math.round(this.CurrentPitch);
            this.fallbackSetTargetPitch(this.SelectedPitch, true);
            return;
        }

        // if PIT switch to VS
        if (this.isPITHold && !this.isVSHold) {
            this.isPITHold = false;
            this.isVSHold = true;
            this.SelectedVS = Math.round((this.CurrentVS) / 100) * 100;
            this.fallbackSetTargetVS(this.SelectedVS, true);
            return;
        }

        // if VS switch to OFF
        if (this.isVSHold && !this.isPITHold) {
            this.isVSHold = false;
            this.isPITHold = false;
            return;
        }
    }

    // left side
    onVSincClicked() {
        if (this.isFLCActive) {
            SimVar.SetSimVarValue("K:AP_SPD_VAR_DEC", "number", 0);
        }
        if (this.isVSHold) {
            SimVar.SetSimVarValue("K:AP_VS_VAR_INC", "number", 0);
            if (this.useCustomAutopilotLogic) {
                this.SelectedVS += 100;
                this.fallbackSetTargetVS(this.SelectedVS);
            }
        }
        if (this.isPITHold) {
            this.SelectedPitch += 1;
            this.fallbackSetTargetPitch(this.SelectedPitch);
        }
        this.log(`VS+ button pressed: ${this.SelectedVS}`);
    }

    onVSdecClicked() {
        if (this.isFLCActive) {
            SimVar.SetSimVarValue("K:AP_SPD_VAR_INC", "number", 0);
        }
        if (this.isVSHold) {
            SimVar.SetSimVarValue("K:AP_VS_VAR_DEC", "number", 0);
            if (this.useCustomAutopilotLogic) {
                this.SelectedVS -= 100;
                this.fallbackSetTargetVS(this.SelectedVS);
            }
        }
        if (this.isPITHold) {
            this.SelectedPitch -= 1;
            this.fallbackSetTargetPitch(this.SelectedPitch);
        }
        this.log(`VS- button pressed: ${this.SelectedVS}`);
    }

    onALTClicked() {
        SimVar.SetSimVarValue("K:AP_ALT_HOLD", "Bool", 1);
        this.log("ALT button pressed");
    }

    onVNVClicked() {
        SimVar.SetSimVarValue("K:AP_VNV_HOLD", "Bool", 1);
        this.log("VNV button pressed");
    }

    // altitude selector
    onALTselClicked() {

        this.altStepModifier = !this.altStepModifier;
        this.log(`ALT Modifier toggled: ${this.altStepModifier ? '1000 ft' : '100 ft'}`);
        this.updateAltSelIndicator(); // Optional UI feedback
    }
    onALTselInc(step = 100) {
        // SimVar.SetSimVarValue("K:AP_ALT_VAR_INC", "number", 0);
        if (!this.CurrentAltitude) this.CurrentAltitude = 0;
        SimVar.SetSimVarValue("AUTOPILOT ALTITUDE LOCK VAR", "feet", this.selecterdAltitude + step);
        this.selecterdAltitude += step
        this.log(`ALT+ ${this.selecterdAltitude}`);
    }
    onALTselDec(step = 100) {
        // SimVar.SetSimVarValue("K:AP_ALT_VAR_DEC", "number", 0);
        if (!this.CurrentAltitude) this.CurrentAltitude = 0;
        SimVar.SetSimVarValue("AUTOPILOT ALTITUDE LOCK VAR", "feet", this.selecterdAltitude - step);
        this.selecterdAltitude -= step;
        this.log(`ALT- ${this.selecterdAltitude}`);
    }

    // bank selector
    onROLselClicked() {
        this.isRollHold = !this.isRollHold;
        SimVar.SetSimVarValue("K:AP_BANK_HOLD", "Bool", 1);
        if (this.useCustomAutopilotLogic && this.isRollHold) {
            this.SelectedRoll = this.CurrentRoll;
            this.fallbackSetTargetBank(this.SelectedRoll, true);
        }
        this.log("ROL Button pressed");
    }

    onROLInc() {
        this.log("onROLInc");
        if (this.SelectedRoll >= 45) {
            this.log(`ROL Increase limit reached: ${this.SelectedRoll}`);
            return;
        }
        if (this.SelectedRoll < 2)
            this.SelectedRoll += 0.25;
        else
            this.SelectedRoll += 1;
        if (this.useCustomAutopilotLogic) {
            this.fallbackSetTargetBank(this.SelectedRoll);
        }
        try {
            SimVar.SetSimVarValue("AUTOPILOT BANK HOLD REF", "degrees", this.SelectedRoll);
        } catch (e) {
            this.log(`Error setting ROL: ${e}`, "ERROR");
        }
        this.log(`ROL Increased ${this.SelectedRoll}`);
    }

    onROLDec() {
        this.log("onROLDec");
        if (this.SelectedRoll <= -45) {
            this.log(`ROL Decrease limit reached: ${this.SelectedRoll}`);
            return;
        }
        if (this.SelectedRoll > -2)
            this.SelectedRoll -= 0.25;
        else
            this.SelectedRoll -= 1;
        if (this.useCustomAutopilotLogic) {
            this.fallbackSetTargetBank(this.SelectedRoll);
        }
        try {
            SimVar.SetSimVarValue("AUTOPILOT BANK HOLD REF", "degrees", this.SelectedRoll);
        } catch (e) {
            this.log(`Error setting ROL: ${e}`, "ERROR");
        }
        this.log(`ROL Decreased ${this.SelectedRoll}`);
    }

    // --- Fallback Autopilot PID logic as methods ---
    fallbackReset() {
        this._bankIntegral = 0;
        this._bankLastError = 0;
        this._vsIntegral = 0;
        this._vsLastError = 0;
        this.targetBank = 0;
        this.targetVS = 0;
        this.targetPitch = 0;
    }
    fallbackSetTargetBank(val, reset = false) {
        if (this.targetBank !== val) {
            if (reset) {
                this._bankIntegral = 0;
                this._bankLastError = 0;
            }
            this.targetBank = val;
        }
    }
    fallbackSetTargetVS(val, reset = false) {
        if (this.targetVS !== val) {
            if (reset) {
                this._vsIntegral = 0;
                this._vsLastError = 0;
            }
            this.targetVS = val;
        }
    }

    fallbackSetTargetPitch(val, reset = false) {
        if (this.targetPitch !== val) {
            if (reset) {
                this._pitchIntegral = 0;
                this._pitchLastError = 0;
            }
            this.targetPitch = val;
        }
    }

    onBtnExperimentalClicked() {
        this.useCustomAutopilotLogic = !this.useCustomAutopilotLogic;
        this.log(`Experimental Autopilot Logic ${this.useCustomAutopilotLogic ? 'ENABLED' : 'DISABLED'}`);
    }

    updateControlsButtonLabel() {
        if (this.btnControls) {
            const mode = this.controlModes[this.controlModeIndex];
            this.btnControls.innerHTML = `controls: ${mode.label}`;
        }
    }

    onControlsClicked() {
        this.log("Controls button clicked");
        this.controlModeIndex = (this.controlModeIndex + 1) % this.controlModes.length;
        this.updateControlsButtonLabel();
        this.log(`Control mode changed to: ${this.controlModes[this.controlModeIndex].label}`);
    }

}

window.customElements.define("my-panel", MyPanel);
checkAutoload();
