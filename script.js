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
    // 1. Capturar valores
    const sem = document.getElementById('selectorSemana').value;
    const nro = document.getElementById('pesajeCorral').value;
    const tratInput = document.getElementById('pesajeTrat').value;
    const pesoT = parseFloat(document.getElementById('pesoTotal').value) || 0;
    const tara = parseFloat(document.getElementById('tara').value) || 0;
    const cant = parseInt(document.getElementById('cantidadAves').value) || 1;

    // 2. Validaciones básicas
    if (!nro || !tratInput || pesoT === 0) {
        alert("Por favor completa: Corral, Tratamiento y Peso Total.");
        return;
    }

    const trat = tratInput.toUpperCase();
    if (!mapaTratamientos[nro]) mapaTratamientos[nro] = trat;

    // 3. Cálculo de peso promedio
    let pAve = (pesoT - tara) / cant;
    if (sem === "0") pAve *= 1000; // Gramos en Día 1

    // 4. Crear objeto de registro
    const reg = {
        nro: nro,
        trat: trat,
        pesoAve: parseFloat(pAve.toFixed(3)),
        muertos: document.getElementById('muertosCant').value,
        fecha: document.getElementById('fechaGeneral').value,
        edad: document.getElementById('edadAve').value
    };

    // 5. Guardar en el historial
    if (!historialPesos[sem]) historialPesos[sem] = [];
    const idx = historialPesos[sem].findIndex(r => r.nro === nro);
    if (idx !== -1) {
        historialPesos[sem][idx] = reg;
    } else {
        historialPesos[sem].push(reg);
    }
    
    // 6. Actualizar y Limpiar
    actualizarTablaVista();
    limpiarSeccionPesaje();
}

function actualizarTablaVista() {
    const sem = document.getElementById('selectorSemana').value;
    const tbody = document.querySelector("#tablaRegistros tbody");
    const semDisplay = document.getElementById('semDisplay'); // Referencia al <span> del HTML
    
    if (!tbody) return; 
    
    tbody.innerHTML = "";
    
    // Actualizar el texto del encabezado de la tabla
    if (semDisplay) {
        semDisplay.innerText = sem === "0" ? "Día 1" : "Semana " + sem;
    }

    // Calcular promedios por tratamiento
    let sumasTrat = {}; 
    if (historialPesos[sem]) {
        historialPesos[sem].forEach(r => {
            if (!sumasTrat[r.trat]) sumasTrat[r.trat] = { suma: 0, cant: 0 };
            sumasTrat[r.trat].suma += r.pesoAve;
            sumasTrat[r.trat].cant += 1;
        });
    }

    // Dibujar Pesajes con alerta de desvío
    if (historialPesos[sem]) {
        historialPesos[sem].forEach(r => {
            const promTrat = sumasTrat[r.trat].suma / sumasTrat[r.trat].cant;
            const desvioPc = ((r.pesoAve - promTrat) / promTrat) * 100;
            const esAlerta = Math.abs(desvioPc) >= 2.5;
            const claseRojo = esAlerta ? 'style="color:red; font-weight:bold;"' : '';

            tbody.innerHTML += `
                <tr class="row-peso">
                    <td>${r.nro}</td>
                    <td>${r.trat}</td>
                    <td ${claseRojo}>${r.pesoAve.toFixed(3)}</td>
                    <td>${promTrat.toFixed(3)}</td>
                </tr>`;
        });
    }

    // Dibujar Alimento
    if (historialAlimento[sem]) {
        historialAlimento[sem].forEach(r => {
            const t = mapaTratamientos[r.nro] || "-";
            tbody.innerHTML += `
                <tr class="row-alim">
                    <td>${r.nro}</td>
                    <td>${t}</td>
                    <td colspan="2">Alim: +${r.agr} / -${r.sob}</td>
                </tr>`;
        });
    }
}



function guardarProgreso() {
    const granja = document.getElementById('granja').value;
    const naci = document.getElementById('fechaNacimiento').value;

    if (!granja || !naci) {
        alert("Primero completa N° Granja y Fecha de Nacimiento");
        return;
    }

    const key = `${granja}_${naci}`;
    const datosParaGuardar = {
        historialPesos: historialPesos,
        historialAlimento: historialAlimento,
        mapaTratamientos: mapaTratamientos
    };

    localStorage.setItem(`data_${key}`, JSON.stringify(datosParaGuardar));
    localStorage.setItem('ultima_granja', granja);
    localStorage.setItem('ultima_fechaNacimiento', naci);
    
    alert("¡Historial guardado con éxito!");
}
<section class="card">
    <h3>Registros Guardados (<span id="semDisplay">Día 1</span>)</h3>
    <div style="overflow-x:auto;">
        <table id="tablaRegistros">
            <thead>
                <tr>
                    <th>Corral</th>
                    <th>Trat.</th>
                    <th>Prom. Ave</th>
                    <th>Prom. Trat.</th>
                </tr>
            </thead>
            <tbody>
                </tbody>
        </table>
    </div>
    
    <div class="btn-group" style="margin-top: 20px;">
        <button onclick="guardarProgreso()" class="btn-save" style="background-color:#28a745;">Guardar Lote</button>
        <button onclick="exportarExcel()" class="btn-save" style="background-color:#6c757d;">Exportar CSV</button>
    </div>
</section>

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

function resetTotal() {
    if (confirm("¿Borrar todos los lotes guardados?")) {
        localStorage.clear();
        location.reload();
    }
}