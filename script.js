let historialPesos = {};
let historialAlimento = {};
let mapaTratamientos = {};
let loteActualKey = "";

window.onload = () => {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaGeneral').value = hoy;
    document.getElementById('granja').value = localStorage.getItem('ultima_granja') || '';
    document.getElementById('fechaNacimiento').value = localStorage.getItem('ultima_fechaNacimiento') || '';
    verificarCambioLote();
    actualizarEdad();
    actualizarTablaVista();
};

function actualizarEdad() {
    const fNac = document.getElementById('fechaNacimiento').value;
    const fReg = document.getElementById('fechaGeneral').value;
    const campoEdad = document.getElementById('edadAve');
    if (fNac && fReg) {
        const diff = new Date(fReg) - new Date(fNac);
        const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
        campoEdad.value = dias >= 0 ? dias : 0;
    }
}

function verificarCambioLote() {
    const granja = document.getElementById('granja').value;
    const nacimiento = document.getElementById('fechaNacimiento').value;
    if (!granja || !nacimiento) return;

    const nuevaKey = `${granja}_${nacimiento}`;
    if (nuevaKey !== loteActualKey) {
        loteActualKey = nuevaKey;
        const datos = JSON.parse(localStorage.getItem(`data_${loteActualKey}`)) || { historialPesos: {}, historialAlimento: {}, mapaTratamientos: {} };
        historialPesos = datos.historialPesos || {};
        historialAlimento = datos.historialAlimento || {};
        mapaTratamientos = datos.mapaTratamientos || {};
        actualizarTablaVista();
    }
}

function autocompletarTratamiento(input, targetId) {
    const corral = input.value;
    const campo = document.getElementById(targetId);
    if (mapaTratamientos[corral]) {
        campo.value = mapaTratamientos[corral];
        if(targetId === 'pesajeTrat') campo.readOnly = true;
    } else {
        campo.value = "";
        campo.readOnly = false;
    }
}

function registrarPesaje() {
    const sem = document.getElementById('selectorSemana').value;
    const nro = document.getElementById('pesajeCorral').value;
    const trat = document.getElementById('pesajeTrat').value.toUpperCase();
    const pesoT = parseFloat(document.getElementById('pesoTotal').value) || 0;
    const tara = parseFloat(document.getElementById('tara').value) || 0;
    const cant = parseInt(document.getElementById('cantidadAves').value) || 1;

    if (!nro || !trat || pesoT === 0) return alert("Faltan datos");
    if (!mapaTratamientos[nro]) mapaTratamientos[nro] = trat;

    let pAve = (pesoT - tara) / cant;
    let unit = (sem === "0") ? "g" : "kg";
    if (sem === "0") pAve *= 1000;

    const reg = {
        nro, trat, pesoAve: pAve.toFixed(3) + unit,
        muertos: document.getElementById('muertosCant').value,
        fecha: document.getElementById('fechaGeneral').value,
        edad: document.getElementById('edadAve').value
    };

    if (!historialPesos[sem]) historialPesos[sem] = [];
    const idx = historialPesos[sem].findIndex(r => r.nro === nro);
    if (idx !== -1) historialPesos[sem][idx] = reg;
    else historialPesos[sem].push(reg);
    
    actualizarTablaVista();
    limpiarSeccionPesaje();
}

function registrarAlimento() {
    const sem = document.getElementById('selectorSemana').value;
    const nro = document.getElementById('alimCorral').value;
    const agr = document.getElementById('alimAgregado').value || "0";
    const sob = document.getElementById('alimSobrante').value || "0";

    if (!nro) return alert("Indica el corral");

    const reg = { nro, agr, sob, fecha: document.getElementById('fechaGeneral').value, edad: document.getElementById('edadAve').value };

    if (!historialAlimento[sem]) historialAlimento[sem] = [];
    const idx = historialAlimento[sem].findIndex(r => r.nro === nro);
    if (idx !== -1) historialAlimento[sem][idx] = reg;
    else historialAlimento[sem].push(reg);

    actualizarTablaVista();
    limpiarSeccionAlimento();
}

function actualizarTablaVista() {
    const sem = document.getElementById('selectorSemana').value;
    document.getElementById('semDisplay').innerText = sem;
    const tbody = document.querySelector("#tablaRegistros tbody");
    tbody.innerHTML = "";

    // Pesajes
    if (historialPesos[sem]) {
        historialPesos[sem].forEach(r => {
            tbody.innerHTML += `<tr class="row-peso"><td>${r.nro}</td><td>PESO</td><td>${r.pesoAve}</td></tr>`;
        });
    }
    // Alimento
    if (historialAlimento[sem]) {
        historialAlimento[sem].forEach(r => {
            tbody.innerHTML += `<tr class="row-alim"><td>${r.nro}</td><td>ALIM</td><td>+${r.agr} / -${r.sob}</td></tr>`;
        });
    }
}

function guardarProgreso() {
    if (!loteActualKey) return alert("Falta Granja/Nacimiento");
    localStorage.setItem(`data_${loteActualKey}`, JSON.stringify({ historialPesos, historialAlimento, mapaTratamientos }));
    localStorage.setItem('ultima_granja', document.getElementById('granja').value);
    localStorage.setItem('ultima_fechaNacimiento', document.getElementById('fechaNacimiento').value);
    alert("Memoria actualizada correctamente.");
}

function exportarExcel() {
    let csv = "\uFEFFGranja:;" + document.getElementById('granja').value + ";Nacimiento:;" + document.getElementById('fechaNacimiento').value + "\n";
    csv += "TIPO;SEMANA;FECHA;EDAD;CORRAL;TRATAMIENTO;PESO_AVE;MUERTOS;ALIM_AGREGADO;ALIM_SOBRANTE\n";

    for (let s in historialPesos) {
        historialPesos[s].forEach(r => {
            csv += `PESAJE;${s};${r.fecha};${r.edad};${r.nro};${r.trat};${r.pesoAve};${r.muertos};-;- \n`;
        });
    }
    for (let s in historialAlimento) {
        historialAlimento[s].forEach(r => {
            const trat = mapaTratamientos[r.nro] || "N/A";
            csv += `ALIMENTO;${s};${r.fecha};${r.edad};${r.nro};${trat};-;-;${r.agr};${r.sob}\n`;
        });
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Reporte_${loteActualKey}.csv`;
    a.click();
}

function limpiarSeccionPesaje() {
    document.getElementById('pesajeCorral').value = "";
    document.getElementById('pesoTotal').value = "";
    document.getElementById('muertosCant').value = "0";
}

function limpiarSeccionAlimento() {
    document.getElementById('alimCorral').value = "";
    document.getElementById('alimAgregado').value = "";
    document.getElementById('alimSobrante').value = "";
    document.getElementById('alimTrat').value = "";
}