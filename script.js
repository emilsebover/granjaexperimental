let historial = {};
let mapaTratamientos = {};
let loteActualKey = "";

window.onload = () => {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaPesaje').value = hoy;
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
        const datosGuardados = JSON.parse(localStorage.getItem(`data_${loteActualKey}`)) || { historial: {}, mapaTratamientos: {} };
        historial = datosGuardados.historial;
        mapaTratamientos = datosGuardados.mapaTratamientos;
        
        localStorage.setItem('ultima_granja', granja);
        localStorage.setItem('ultima_fechaNacimiento', nacimiento);

        document.getElementById('avisoLote').style.display = "block";
        setTimeout(() => document.getElementById('avisoLote').style.display = "none", 3000);
        
        actualizarEdad();
        actualizarTabla();
    }
}

function actualizarEdad() {
    const fNac = document.getElementById('fechaNacimiento').value;
    const fPes = document.getElementById('fechaPesaje').value;
    if (fNac && fPes) {
        const diff = new Date(fPes) - new Date(fNac);
        const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
        document.getElementById('edadAve').value = dias >= 0 ? dias : 0;
    }
}

document.getElementById('nroCorral').addEventListener('input', function() {
    const corral = this.value;
    const campoTrat = document.getElementById('tratamiento');
    if (mapaTratamientos[corral]) {
        campoTrat.value = mapaTratamientos[corral];
        campoTrat.readOnly = true;
    } else {
        campoTrat.value = "";
        campoTrat.readOnly = false;
    }
});

function registrarCorral() {
    const sem = document.getElementById('selectorSemana').value;
    const nroCorral = document.getElementById('nroCorral').value;
    const tratamiento = document.getElementById('tratamiento').value.toUpperCase();
    const pesoTotal = parseFloat(document.getElementById('pesoTotal').value) || 0;
    const tara = parseFloat(document.getElementById('tara').value) || 0;
    const cant = parseInt(document.getElementById('cantidadAves').value) || 1;

    if (!nroCorral || !tratamiento || pesoTotal === 0) return alert("Faltan datos obligatorios");

    if (!mapaTratamientos[nroCorral]) {
        mapaTratamientos[nroCorral] = tratamiento;
    }

    // Cálculo: (Peso - Tara) / Cantidad
    let pAve = (pesoTotal - tara) / cant;
    let unit = (sem == "0") ? "g" : "kg";
    if (sem == "0") pAve *= 1000; // Día 1 se muestra en gramos

    const registro = {
        nroCorral, tratamiento, edad: document.getElementById('edadAve').value,
        fecha: document.getElementById('fechaPesaje').value,
        pesoAve: pAve.toFixed(3), unit,
        consumo: (parseFloat(document.getElementById('alimAgregado').value || 0) - parseFloat(document.getElementById('alimSobrante').value || 0)).toFixed(2),
        muertos: document.getElementById('muertosCant').value,
        pesoM: document.getElementById('muertosPeso').value,
        taraSemana: tara
    };

    if (!historial[sem]) historial[sem] = [];
    const idx = historial[sem].findIndex(r => r.nroCorral === nroCorral);
    if (idx !== -1) historial[sem][idx] = registro;
    else historial[sem].push(registro);
    
    actualizarTabla();
    limpiarCampos();
}

function actualizarTabla() {
    const sem = document.getElementById('selectorSemana').value;
    const tbody = document.querySelector("#tablaRegistros tbody");
    tbody.innerHTML = "";
    const regs = (historial[sem] || []).sort((a,b) => a.nroCorral - b.nroCorral);
    regs.forEach(r => {
        tbody.innerHTML += `<tr><td>${r.nroCorral}</td><td>${r.tratamiento}</td><td>${r.pesoAve}${r.unit}</td><td>${r.consumo}k</td><td>${r.muertos}</td></tr>`;
    });
}

function guardarProgreso() {
    if (!loteActualKey) return alert("Define Granja y Nacimiento");
    localStorage.setItem(`data_${loteActualKey}`, JSON.stringify({ historial, mapaTratamientos }));
    alert("Datos guardados.");
}

function exportarExcel() {
    let csv = "\uFEFFGranja:;" + document.getElementById('granja').value + ";Nacimiento:;" + document.getElementById('fechaNacimiento').value + "\n";
    csv += "Semana;Fecha;Edad;Corral;Tratamiento;PesoAve;Unidad;Tara;Consumo;Muertos;PesoMuertos\n";
    for (let s in historial) {
        historial[s].forEach(r => {
            csv += `${s};${r.fecha};${r.edad};${r.nroCorral};${r.tratamiento};${r.pesoAve};${r.unit};${r.taraSemana};${r.consumo};${r.muertos};${r.pesoM}\n`;
        });
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `Reporte_${loteActualKey}.csv`;
    a.href = url;
    a.click();
}

function resetTotal() {
    if (confirm("¿Borrar todos los lotes guardados?")) {
        localStorage.clear();
        location.reload();
    }
}

function cambiarSemana() { actualizarTabla(); }

function limpiarCampos() {
    document.getElementById('nroCorral').value = "";
    document.getElementById('pesoTotal').value = "";
    document.getElementById('alimSobrante').value = "";
    document.getElementById('muertosCant').value = "0";
    document.getElementById('muertosPeso').value = "0";
    document.getElementById('nroCorral').focus();
}