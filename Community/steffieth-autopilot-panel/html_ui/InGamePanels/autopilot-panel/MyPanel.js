class MyPanel extends TemplateElement {
    constructor() {
        super(...arguments);
        this.apTextLabel = null;
        this.debug = false;
        this.txtDebugLog = null;
        this.txtDebugLogLabel = null;
        this.apTextLabel = null;
        this.autopilotMaster = false;

        this.buttonStateMap = [
            { button: "btnAP",      state: () => this.autopilotMaster },
            { button: "btnALTsel",  state: () => this.altStepModifier },
            { button: "btnHDG",     state: () => this.isHeadingHold },
            { button: "btnALT",     state: () => this.isAltitudeHold },
            { button: "btnNAV",     state: () => this.isNavActive },
            { button: "btnAPR",     state: () => this.APRHold },
            { button: "btnVS",      state: () => this.isVSHold },
            { button: "btnIAS",     state: () => this.isFLCActive },
            { button: "btnLVL",     state: () => this.wingsLevelActive },
            { button: "btnROL",     state: () => this.isRollHold },
        ];


        this.initialize();
    }

    connectedCallback() {
        super.connectedCallback();
        this.initialize();
    }

    initialize() {
        if (this.started) return;

        this.version = "v0.0.1";
        this.ingameUi = this.querySelector("ingame-ui");

        // stile of Garmin GMC 305 Auto Pilot Control Panel 
        // ------------------------------------------------
        // (HDG) | HDG NAV | AP  LVL | VS+ IAS ALT | (ALT)
        //  bug  |     APR | FD  YD  | VS- VS  VNV |  sel
        // ------------------------------------------------
    this.btnHDG = this.querySelector('#btnHDG');
    if (this.btnHDG) this.btnHDG.addEventListener("click", () => this.onHDGClicked());
    this.btnNAV = this.querySelector('#btnNAV');
    if (this.btnNAV) this.btnNAV.addEventListener("click", () => this.onNAVClicked());
    this.btnAPR = this.querySelector('#btnAPR');
    if (this.btnAPR) this.btnAPR.addEventListener("click", () => this.onAPRClicked());
    // ---
    this.btnAP = this.querySelector('#btnAP');
    if (this.btnAP) this.btnAP.addEventListener("click", () => this.onAPClicked());
    this.btnLVL = this.querySelector('#btnLVL');
    if (this.btnLVL) this.btnLVL.addEventListener("click", () => this.onLVLClicked());
    this.btnFD = this.querySelector('#btnFD');
    if (this.btnFD) this.btnFD.addEventListener("click", () => this.onFDClicked());
    this.btnYD = this.querySelector('#btnYD');
    if (this.btnYD) this.btnYD.addEventListener("click", () => this.onYDClicked());
    // ---
    this.btnVSinc = this.querySelector('#btnVSinc');
    if (this.btnVSinc) this.btnVSinc.addEventListener("click", () => this.onVSincClicked());
    if (this.btnVSinc) this.btnVSinc.addEventListener("wheel", (event) => {
        this.log(String(event.deltaY));
        if (event.deltaY < 0) this.onVSincClicked(); else this.onVSdecClicked();
    });
    this.btnVSdec = this.querySelector('#btnVSdec');
    if (this.btnVSdec) this.btnVSdec.addEventListener("click", () => this.onVSdecClicked());
    this.btnVSdec.addEventListener("wheel", (event) => {
        this.log(String(event.deltaY));
        if (event.deltaY < 0) this.onVSincClicked(); else this.onVSdecClicked();
    });
    // IAS
    this.btnIAS = this.querySelector('#btnIAS');
    if (this.btnIAS) this.btnIAS.addEventListener("click", () => this.onIASClicked());
    if (this.btnIAS) this.btnIAS.addEventListener("wheel", (event) => {
        this.log(String(event.deltaY));
        if (event.deltaY < 0) this.onVSincClicked(); else this.onVSdecClicked();
    });
    // VS
    this.btnVS = this.querySelector('#btnVS');
    if (this.btnVS) this.btnVS.addEventListener("click", () => this.onVSClicked());
    if (this.btnVS) this.btnVS.addEventListener("wheel", (event) => {
        this.log(String(event.deltaY));
        if (event.deltaY < 0) this.onVSincClicked(); else this.onVSdecClicked();
    });

    this.btnALT = this.querySelector('#btnALT');
    if (this.btnALT) this.btnALT.addEventListener("click", () => this.onALTClicked());
    /* support both btnVNAV (HTML) and btnVNV (older/typo names) */
    this.btnVNV = this.querySelector('#btnVNAV') || this.querySelector('#btnVNV');
    if (this.btnVNV) this.btnVNV.addEventListener("click", () => this.onVNVClicked());

    this.btnHDGBug = this.querySelector('#btnHDGSel') || this.querySelector('#btnHDGBug');
    if (this.btnHDGBug) {
        this.btnHDGBug.addEventListener("click", () => this.onHDGBugClicked());
        // handle wheel for heading adjustment
        this.btnHDGBug.addEventListener("wheel", (event) => {
            this.log(String(event.deltaY));
            if (event.deltaY < 0) this.onHDGBugInc(); else this.onHDGBugDec();
        });
    }

    this.btnALTsel = this.querySelector('#btnAltSel') || this.querySelector('#btnALTsel');
    if (this.btnALTsel) {
        // Modifier state
        this.altStepModifier = false; // false = 100ft, true = 1000ft

        // Left click: set ALT to current
        this.btnALTsel.addEventListener("click", (ev) => this.onALTselClicked(ev));

        // Right click: toggle step size
        this.btnALTsel.addEventListener("contextmenu", (ev) => {
            this.log("btnALTsel contextmenu");
        });

        // Use wheel for altitude adjustment
        this.btnALTsel.addEventListener("wheel", (event) => {
            event.preventDefault(); // Block default scroll
            const step = this.altStepModifier ? 1000 : 100;

            this.log(`deltaY: ${event.deltaY}, modifier: ${this.altStepModifier}, step: ${step}`);

            if (event.deltaY < 0) this.onALTselInc(step);
            else this.onALTselDec(step);
        });
    }

    this.btnROL = this.querySelector('#btnROL');
    if (this.btnROL) {
        this.btnROL.addEventListener("click", () => this.onROLselClicked());
        this.btnHDGBug.addEventListener("wheel", (event) => {
            this.log(String(event.deltaY));
            if (event.deltaY < 0) this.onROLInc(); else this.onROLDec();
        });
    }


    this.btnALTinc = this.querySelector('#btnALTinc');
    if (this.btnALTinc) this.btnALTinc.addEventListener("click", (ev) => this.onALTselInc(ev && ev.shiftKey ? 1000 : 100));
    this.btnALTdec = this.querySelector('#btnALTdec');
    if (this.btnALTdec) this.btnALTdec.addEventListener("click", (ev) => this.onALTselDec(ev && ev.shiftKey ? 1000 : 100));

    this.btnHDGinc = this.querySelector('#btnHDGinc');
    if (this.btnHDGinc) this.btnHDGinc.addEventListener("click", () => this.onHDGBugInc());
    this.btnHDGdec = this.querySelector('#btnHDGdec');
    if (this.btnHDGdec) this.btnHDGdec.addEventListener("click", () => this.onHDGBugDec());

    this.txtDebugLog = this.querySelector('#txtDebugLog');
    this.txtDebugLogLabel = this.querySelector('#debug-log-label');
    this.apTextLabel = this.querySelector('#ap-text-label');

    // Triple-click on ap-text-label to toggle debug mode
    if (this.apTextLabel) {
        let clickCount = 0;
        let clickTimer = null;
        this.apTextLabel.addEventListener('click', () => {
            clickCount++;
            if (clickCount === 1) {
                // Start a timer; reset after 300ms of no clicks
                clickTimer = setTimeout(() => {
                    clickCount = 0;
                }, 300);
            }
            if (clickCount === 3) {
                clearTimeout(clickTimer);
                clickCount = 0;
                // Toggle debug mode
                this.debug = !this.debug;
                if (this.txtDebugLog) this.txtDebugLog.style.display = this.debug ? "block" : "none";
                if (this.txtDebugLogLabel) this.txtDebugLogLabel.style.display = this.debug ? "block" : "none";
                this.log(`DEBUG MODE ${this.debug ? 'ON' : 'OFF'}`);
            }
        });
    }

    // Hide debug log if debug flag is false
    if (!this.debug && this.txtDebugLog) {
        this.txtDebugLog.style.display = "none";
        this.txtDebugLogLabel.style.display = "none";
    }

        // Start telemetry loop
        setInterval(() => this.update(), 100);

        this.started = true;
    }

    updateAltSelIndicator() {
        if (this.altStepModifier) {
            this.btnALTsel.classList.add("active");
        } else {
            this.btnALTsel.classList.remove("active");
        }
    }

    log(msg) {
        if (!this.debug || !this.txtDebugLog) return;
        // also send to dev console for visibility
        try { console.log(msg); } catch (e) {}
        // append text (convert objects/events to readable string)
        let s;
        if (typeof msg === 'string') s = msg;
        else if (msg && msg.message) s = msg.message;
        else {
            try { s = JSON.stringify(msg); } catch (e) { s = String(msg); }
        }
        this.txtDebugLog.value = (this.txtDebugLog.value ? this.txtDebugLog.value + '\r\n' : '') + s;
        this.txtDebugLog.scrollTop = this.txtDebugLog.scrollHeight;
    }

    writePanelText(text) {
        if (!this.apTextLabel) return;
        // convert newlines to <br> for display and use innerHTML to render them
        let html = text.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');
        this.apTextLabel.innerHTML = html;
    }

    update() {
        this.getStates();
        this.setAPPanelText();
        this.updateHDGIndicator();
        this.updateButtonStates();

        // Hide debug log if debug flag is false
        if (!this.debug && this.txtDebugLog) {
            this.txtDebugLog.style.display = "none";
            this.txtDebugLogLabel.style.display = "none";
        } else
        {
            // unhide
            this.txtDebugLog.style.display = "?";
            this.txtDebugLogLabel.style.display = "?";
        }
    }

    updateButtonStates() {
        if (!this.buttonStateMap) return;

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


    updateHDGIndicator() {
        this.btnHDGBug.title = `${Math.round(this.selectedHeadingBug)}`;
        this.btnHDGBug.innerHTML = `${Math.round(this.selectedHeadingBug)}`;

                // Update heading indicator rotation
        if (this.btnHDGBug) {
            const hdgIndicator = document.getElementById('hdg-indicator');
            if (hdgIndicator) {
                // Calculate relative heading: how many degrees the bug is ahead of current heading
                let relativeHeading = this.selectedHeadingBug - this.currentHeading;
                // Handle 360-degree wrap-around
                while (relativeHeading > 180) relativeHeading -= 360;
                while (relativeHeading < -180) relativeHeading += 360;
                // Apply rotation to the indicator
                hdgIndicator.style.transform = `rotate(${relativeHeading}deg)`;
            }
        }
    }

    setAPPanelText() {
        const COL_AP     = 6;
        const COL_MODE   = 6;
        const COL_ALT    = 6;
        const COL_NUM    = 10;
        const PAD_CHAR   = " ";

        // RIGHT-aligned, no internal spaces
        const fmt = (num, width = 6) =>
            `${Math.round(num)}`.padStart(width, PAD_CHAR);

        if(!this.autopilotAvailable) 
        {
            this.writePanelText("Unavailable<br> ");
            return;
        }

        if(!this.autopilotMaster) 
        {
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
            line2 += `${fmt(this.selectedVS)} fpm`.padEnd(COL_NUM, PAD_CHAR);

    

        this.writePanelText(line1 + "<br>" + line2);
    }



    // --- SIMVAR COLLECTION ---
    getStates() {
        // AP
        this.autopilotMaster = SimVar.GetSimVarValue("AUTOPILOT MASTER", "Bool") > 0;
        this.autopilotAvailable = SimVar.GetSimVarValue("AUTOPILOT AVAILABLE", "Bool") > 0;
        // ALT
        this.currentAltitude = SimVar.GetSimVarValue("PLANE ALTITUDE", "feet");
        this.selecterdAltitude = SimVar.GetSimVarValue("AUTOPILOT ALTITUDE LOCK VAR", "feet");
        this.isAltitudeHold = SimVar.GetSimVarValue("AUTOPILOT ALTITUDE LOCK", "Bool") > 0;
        this.isAltitudeArmed = SimVar.GetSimVarValue("AUTOPILOT ALTITUDE ARM", "Bool") > 0;
        // HDG
        this.isHeadingHold = SimVar.GetSimVarValue("AUTOPILOT HEADING LOCK", "Bool") > 0;
        this.currentHeading = SimVar.GetSimVarValue("PLANE HEADING DEGREES MAGNETIC", "degrees");
        this.selectedHeadingBug = SimVar.GetSimVarValue("AUTOPILOT HEADING LOCK DIR", "degrees");
        // LVL / ROL
        this.isRollHold = SimVar.GetSimVarValue("AUTOPILOT BANK HOLD", "Bool") > 0;
        this.SelectRoll = SimVar.GetSimVarValue("AUTOPILOT BANK HOLD REF", "Bool") > 0;
        this.wingsLevelActive = SimVar.GetSimVarValue("AUTOPILOT WING LEVELER", "Bool") > 0;
        // VS
        this.isVSHold = SimVar.GetSimVarValue("AUTOPILOT VERTICAL HOLD", "Bool") > 0;
        this.selectedVS = SimVar.GetSimVarValue("AUTOPILOT VERTICAL HOLD VAR", "feet per minute");
        // Airspeed / IAS / FLC
        this.currentAirspeed = SimVar.GetSimVarValue("AIRSPEED INDICATED", "knots");
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
    }

    // heading bug
    onHDGBugClicked() {
        // sync heading bug with current heading
        SimVar.SetSimVarValue("K:HEADING_BUG_SET", "degrees", this.currentHeading);
        this.selectedHeadingBug = this.currentHeading;
        this.log("HDG Bug synced to current heading");
    }
    onHDGBugInc() { 
        // SimVar.SetSimVarValue("K:HEADING_BUG_INC", "number", 0);
        SimVar.SetSimVarValue("K:HEADING_BUG_SET", "degrees", this.selectedHeadingBug + 1);
        this.selectedHeadingBug++;
        this.log("HDG Bug increased");
    }
    onHDGBugDec() { 
        // SimVar.SetSimVarValue("K:HEADING_BUG_DEC", "number", 0);
        SimVar.SetSimVarValue("K:HEADING_BUG_SET", "degrees", this.selectedHeadingBug - 1);
        this.selectedHeadingBug--;
        this.log("HDG Bug decreased");
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
        this.log(`AP Master toggled to ${this.autopilotMaster ? "OFF" : "ON"}`);
    if (this.apTextLabel) this.apTextLabel.textContent = this.autopilotMaster ? "AP OFF" : "AP ON";
    }

    onLVLClicked() {
        SimVar.SetSimVarValue("K:AP_WING_LEVELER", "Bool", 1);
        SimVar.SetSimVarValue("K:AP_PITCH_LEVELER", "Bool", 1);
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

    // left side
    onVSincClicked() {
        if(this.isFLCActive) {
                    SimVar.SetSimVarValue("K:AP_SPD_VAR_DEC", "number", 0);
                }
        if(this.isVSHold) {
                    SimVar.SetSimVarValue("K:AP_VS_VAR_INC", "number", 0);
                }
        this.log("VS+ button pressed");
    }

    onVSdecClicked() {
        if(this.isFLCActive) {
                    SimVar.SetSimVarValue("K:AP_SPD_VAR_INC", "number", 0);
                }
        if(this.isVSHold) {
                    SimVar.SetSimVarValue("K:AP_VS_VAR_DEC", "number", 0);
                }
        this.log("VS- button pressed");
    }

    onIASClicked() {
        // SimVar.SetSimVarValue("K:AP_IAS_HOLD", "Bool", 1);
        SimVar.SetSimVarValue("K:FLIGHT_LEVEL_CHANGE", "Bool", 1);
        this.selectedIAS = this.currentAirspeed;
        this.SetSimVarValue("AUTOPILOT AIRSPEED LOCK VAR", "knots", this.selectedIAS);
        this.log("IAS button pressed");
    }

    onVSClicked() {
        SimVar.SetSimVarValue("K:AP_VS_HOLD", "Bool", 1);
        this.log("VS button pressed");
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
    onALTselClicked(event) {

        this.altStepModifier = !this.altStepModifier;
        this.log(`ALT Modifier toggled: ${this.altStepModifier ? '1000 ft' : '100 ft'}`);
        this.updateAltSelIndicator(); // Optional UI feedback
    }
    onALTselInc(step = 100) { 
        // SimVar.SetSimVarValue("K:AP_ALT_VAR_INC", "number", 0);
        if (!this.currentAltitude) this.currentAltitude = 0;
        SimVar.SetSimVarValue("AUTOPILOT ALTITUDE LOCK VAR", "feet", this.selecterdAltitude + step);
        this.selecterdAltitude += step;
        this.log(`ALT+ ${this.selecterdAltitude}`);
    }
    onALTselDec(step = 100) { 
        // SimVar.SetSimVarValue("K:AP_ALT_VAR_DEC", "number", 0);
        if (!this.currentAltitude) this.currentAltitude = 0;
        SimVar.SetSimVarValue("AUTOPILOT ALTITUDE LOCK VAR", "feet", this.selecterdAltitude - step);
        this.selecterdAltitude -= step;
        this.log(`ALT- ${this.selecterdAltitude}`);
    }

    // bank selector
    onROLselClicked() {
        SimVar.SetSimVarValue("K:AP_BANK_HOLD", "Bool", 1);
        this.log("BNK Button pressed");
    }

    onROLInc() {
        if(this.SelectRoll <= 45) return;
        this.SelectRoll = SelectRoll++
        SimVar.SetSimVarValue("AUTOPILOT BANK HOLD REF", "degrees", SelectRoll);
    }

    onROLDec() {
        if(this.SelectRoll <= -45) return;
        this.SelectRoll = SelectRoll--
        SimVar.SetSimVarValue("AUTOPILOT BANK HOLD REF", "degrees", SelectRoll);
    }
}

window.customElements.define("my-panel", MyPanel);
checkAutoload();
