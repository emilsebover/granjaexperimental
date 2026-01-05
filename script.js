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
    const naci = document.getElementById('fechaNacimiento').value;
    if (!granja || !naci) return;
    const nuevaKey = `${granja}_${naci}`;
    if (nuevaKey !== loteActualKey) {
        loteActualKey = nuevaKey;
        const d = JSON.parse(localStorage.getItem(`data_${loteActualKey}`)) || { historialPesos:{}, historialAlimento:{}, mapaTratamientos:{} };
        historialPesos = d.historialPesos || {};
        historialAlimento = d.historialAlimento || {};
        mapaTratamientos = d.mapaTratamientos || {};
        actualizarTablaVista();
    }
}

function autocompletarTratamiento(input, targetId) {
    const c = input.value;
    const target = document.getElementById(targetId);
    if (mapaTratamientos[c]) {
        target.value = mapaTratamientos[c];
        if(targetId === 'pesajeTrat') target.readOnly = true;
    } else {
        target.value = "";
        target.readOnly = false;
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
    if (sem === "0") pAve *= 1000;

    const reg = { nro, trat, pesoAve: parseFloat(pAve.toFixed(3)), muertos: document.getElementById('muertosCant').value, fecha: document.getElementById('fechaGeneral').value, edad: document.getElementById('edadAve').value };

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
    if (!nro) return alert("Indica corral");

    const reg = { nro, agr, sob, fecha: document.getElementById('fechaGeneral').value };
    if (!historialAlimento[sem]) historialAlimento[sem] = [];
    const idx = historialAlimento[sem].findIndex(r => r.nro === nro);
    if (idx !== -1) historialAlimento[sem][idx] = reg;
    else historialAlimento[sem].push(reg);

    actualizarTablaVista();
    limpiarSeccionAlimento();
}

function actualizarTablaVista() {
    const sem = document.getElementById('selectorSemana').value;
    const tbody = document.querySelector("#tablaRegistros tbody");
    const semDisplay = document.getElementById('semDisplay');
    if (!tbody) return;
    tbody.innerHTML = "";
    if (semDisplay) semDisplay.innerText = sem === "0" ? "Día 1" : "Semana " + sem;

    let sumasTrat = {};
    if (historialPesos[sem]) {
        historialPesos[sem].forEach(r => {
            if (!sumasTrat[r.trat]) sumasTrat[r.trat] = { s: 0, c: 0 };
            sumasTrat[r.trat].s += r.pesoAve;
            sumasTrat[r.trat].c += 1;
        });
    }

    if (historialPesos[sem]) {
        historialPesos[sem].forEach(r => {
            const promTrat = sumasTrat[r.trat].s / sumasTrat[r.trat].c;
            const desvio = Math.abs(((r.pesoAve - promTrat) / promTrat) * 100);
            const estilo = desvio >= 2.5 ? 'style="color:red; font-weight:bold;"' : '';
            tbody.innerHTML += `<tr class="row-peso"><td>${r.nro}</td><td>${r.trat}</td><td ${estilo}>${r.pesoAve.toFixed(3)}</td><td>${promTrat.toFixed(3)}</td></tr>`;
        });
    }

    if (historialAlimento[sem]) {
        historialAlimento[sem].forEach(r => {
            const t = mapaTratamientos[r.nro] || "-";
            tbody.innerHTML += `<tr class="row-alim"><td>${r.nro}</td><td>${t}</td><td colspan="2">Alim: +${r.agr} / -${r.sob}</td></tr>`;
        });
    }
}

function guardarProgreso() {
    if (!loteActualKey) return alert("Falta Granja/Nacimiento");
    localStorage.setItem(`data_${loteActualKey}`, JSON.stringify({ historialPesos, historialAlimento, mapaTratamientos }));
    localStorage.setItem('ultima_granja', document.getElementById('granja').value);
    localStorage.setItem('ultima_fechaNacimiento', document.getElementById('fechaNacimiento').value);
    alert("¡Historial guardado!");
}

// --- ACTUALIZACIÓN DE EXPORTAR (Añade columna Peso Muertos) ---
function exportarExcel() {
    let csv = "\uFEFFGranja:;" + document.getElementById('granja').value + ";Nacimiento:;" + document.getElementById('fechaNacimiento').value + "\n";
    // Encabezado con PESO_MUERTOS
    csv += "TIPO;SEMANA;FECHA;EDAD;CORRAL;TRATAMIENTO;PESO_AVE;MUERTOS;PESO_MUERTOS;ALIM_AGREGADO;ALIM_SOBRANTE\n";

    for (let s in historialPesos) {
        historialPesos[s].forEach(r => { 
            // Se incluye r.muertosPeso (asegúrate de que esté capturado en registrarPesaje)
            csv += `PESAJE;${s};${r.fecha};${r.edad};${r.nro};${r.trat};${r.pesoAve};${r.muertos};${r.muertosPeso || 0};-;- \n`; 
        });
    }
    for (let s in historialAlimento) {
        historialAlimento[s].forEach(r => { 
            const t = mapaTratamientos[r.nro] || "N/A";
            csv += `ALIMENTO;${s};${r.fecha};-;${r.nro};${t};-;-;-;${r.agr};${r.sob}\n`; 
        });
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Reporte_${loteActualKey}.csv`;
    a.click();
}

// --- FUNCIÓN PARA BORRAR TODO ---
function borrarTodoElHistorial() {
    const confirmar1 = confirm("¿Estás seguro de que quieres borrar TODOS los datos de este lote? Esta acción no se puede deshacer.");
    if (confirmar1) {
        const confirmar2 = confirm("¡Última advertencia! Se eliminarán pesajes y alimentos de todas las semanas. ¿Continuar?");
        if (confirmar2) {
            // Limpiar variables
            historialPesos = {};
            historialAlimento = {};
            mapaTratamientos = {};
            
            // Limpiar LocalStorage del lote actual
            if (loteActualKey) {
                localStorage.removeItem(`data_${loteActualKey}`);
            }
            
            // Actualizar vista
            actualizarTablaVista();
            alert("Historial borrado por completo.");
        }
    }
}

function limpiarSeccionPesaje() { 
    document.getElementById('pesajeCorral').value = ""; 
    document.getElementById('pesoTotal').value = ""; 
    document.getElementById('muertosCant').value = "0"; 
    document.getElementById('muertosPeso').value = "0"; // Añadimos esta línea
}

function limpiarSeccionAlimento() { 
    document.getElementById('alimCorral').value = ""; 
    document.getElementById('alimAgregado').value = ""; 
    document.getElementById('alimSobrante').value = ""; 
    document.getElementById('alimTrat').value = ""; // También limpiamos el tratamiento visual
}