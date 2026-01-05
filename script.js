let historialPesos = {};
let historialAlimento = {};
let mapaTratamientos = {};
let loteActualKey = "";

window.onload = () => {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaPesaje').value = hoy;
    document.getElementById('fechaAlim').value = hoy;
    document.getElementById('granja').value = localStorage.getItem('ultima_granja') || '';
    document.getElementById('fechaNacimiento').value = localStorage.getItem('ultima_fechaNacimiento') || '';
    verificarCambioLote();
};

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
        localStorage.setItem('ultima_granja', granja);
        localStorage.setItem('ultima_fechaNacimiento', nacimiento);
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

    if (!nro || !trat || pesoT === 0) return alert("Faltan datos en pesaje");
    if (!mapaTratamientos[nro]) mapaTratamientos[nro] = trat;

    let pAve = (pesoT - tara) / cant;
    if (sem == "0") pAve *= 1000;

    const reg = {
        fecha: document.getElementById('fechaPesaje').value,
        nro, trat, pesoAve: pAve.toFixed(3),
        muertos: document.getElementById('muertosCant').value,
        pesoM: document.getElementById('muertosPeso').value
    };

    if (!historialPesos[sem]) historialPesos[sem] = [];
    const idx = historialPesos[sem].findIndex(r => r.nro === nro);
    if (idx !== -1) historialPesos[sem][idx] = reg;
    else historialPesos[sem].push(reg);
    
    alert("Pesaje guardado");
}

function registrarAlimento() {
    const sem = document.getElementById('selectorSemana').value;
    const nro = document.getElementById('alimCorral').value;
    const agregado = document.getElementById('alimAgregado').value || "0";
    const sobrante = document.getElementById('alimSobrante').value || "0";

    if (!nro) return alert("Indica el número de corral");

    const reg = {
        fecha: document.getElementById('fechaAlim').value,
        nro, agregado, sobrante
    };

    if (!historialAlimento[sem]) historialAlimento[sem] = [];
    const idx = historialAlimento[sem].findIndex(r => r.nro === nro);
    if (idx !== -1) historialAlimento[sem][idx] = reg;
    else historialAlimento[sem].push(reg);

    alert("Alimento guardado");
}

function guardarProgreso() {
    localStorage.setItem(`data_${loteActualKey}`, JSON.stringify({ historialPesos, historialAlimento, mapaTratamientos }));
    alert("Lote guardado en memoria");
}

function exportarExcel() {
    let csv = "\uFEFFGranja:;" + document.getElementById('granja').value + ";Nacimiento:;" + document.getElementById('fechaNacimiento').value + "\n\n";
    csv += "TIPO;SEMANA;FECHA;CORRAL;TRATAMIENTO;PESO_AVE;MUERTOS;PESO_MUERTOS;ALIM_AGREGADO;ALIM_SOBRANTE\n";

    // Exportar Pesos
    for (let s in historialPesos) {
        historialPesos[s].forEach(r => {
            csv += `PESAJE;${s};${r.fecha};${r.nro};${r.trat};${r.pesoAve};${r.muertos};${r.pesoM};-;- \n`;
        });
    }
    // Exportar Alimento
    for (let s in historialAlimento) {
        historialAlimento[s].forEach(r => {
            const trat = mapaTratamientos[r.nro] || "N/A";
            csv += `ALIMENTO;${s};${r.fecha};${r.nro};${trat};-;-;-;${r.agregado};${r.sobrante}\n`;
        });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `Reporte_${loteActualKey}.csv`;
    a.href = url;
    a.click();
}

function cambiarSemana() {}