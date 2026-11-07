// Guardar la fila del filtro actual en el consolidado, exportar a Excel y cambiar el archivo vinculado.
(() => {
  const PYL = globalThis.PYL;
  const app = PYL.app, S = app.state;
  const { $, el } = PYL.ui.dom;
  const { toast, ask } = PYL.ui.feedback;
  const { writeRegistro, buildExport } = PYL.core.excel;
  const { pickXlsx, download } = PYL.services.files;
  const consolidado = PYL.services.consolidado;
  const { MASTER_NAME } = consolidado;

  async function updateWho() {
    const h = await consolidado.linked();
    const who = $('#save-who'); who.textContent = '';
    if (h) who.append('Archivo vinculado: ', el('b', null, h.name), '. Ciérralo en Excel antes de guardar.');
    else if (consolidado.supported) who.append('Agrega la fila del filtro actual a ', el('b', null, 'Utilidad_Consolidado_Global.xlsx'), '. La primera vez me pide elegir el archivo.');
    else who.append('Este navegador no escribe archivos locales: al guardar elijo el consolidado y se descarga una copia actualizada para reemplazarlo. Usa Chrome o Edge para guardar directo.');
  }

  // Elegir uno existente o crear uno nuevo; null si el usuario cancela.
  async function chooseHandle(title, text) {
    const r = await ask(title, text, [
      { r: 'open', label: 'Elegir existente' },
      { r: 'new', label: 'Crear nuevo', cls: 'primary' },
    ]);
    const h = r === 'open' ? await consolidado.pick() : r === 'new' ? await consolidado.create() : null;
    if (h) updateWho();
    return h;
  }

  async function getHandle() {
    if (!(await consolidado.restore()) && !(await chooseHandle('Consolidado', `Elige tu ${MASTER_NAME} o crea uno nuevo con la estructura de 20 columnas.`))) return null;
    return consolidado.ensureWrite(consolidado.current());
  }

  // Con File System Access se escribe sobre el archivo vinculado; sin él, se elige y se descarga una copia.
  async function save() {
    if (!S.current) return;
    const btn = $('#btn-save'); btn.disabled = true;
    try {
      const { a, x } = S.current;
      let file, h;
      if (consolidado.supported) {
        let missing = false;
        try {
          h = await getHandle();
          if (!h) return;
          file = await h.getFile();
        } catch (e) {
          if (e.name !== 'NotFoundError') throw e;
          missing = true;
        }
        if (missing) {
          // El archivo vinculado se movió o se eliminó: ofrecer crearlo de nuevo.
          const name = consolidado.current()?.name || MASTER_NAME;
          h = await chooseHandle('No encontré el consolidado', `${name} ya no existe en su carpeta (¿lo moviste o eliminaste?). Crea uno nuevo o elige otro archivo.`);
          if (!h) return;
          await consolidado.ensureWrite(h);
          file = await h.getFile();
        }
      } else { file = await pickXlsx(); if (!file) return; }
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      let res = writeRegistro(wb, a, x, 'ask');
      if (res.dup) {
        const choice = await ask('Registro duplicado', `Ya existe "${x.periodo} · ${x.producto} · ${x.campana}" en la fila ${res.dup}. ¿Qué hago?`, [
          { r: 'append', label: 'Agregar como nueva fila' },
          { r: 'overwrite', label: 'Sobrescribir', cls: 'primary' },
        ]);
        if (choice === 'cancel') return;
        res = writeRegistro(wb, a, x, choice);
      }
      const out = await wb.xlsx.writeBuffer();
      if (consolidado.supported) {
        const w = await h.createWritable();
        await w.write(out); await w.close();
        toast(`${res.overwritten ? 'Sobrescrita' : 'Guardada'} la fila ${res.row} en ${h.name}`, 'ok');
      } else {
        download(out, file.name);
        toast(`Descargado ${file.name} con la fila ${res.row}. Reemplaza el original.`, 'ok');
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      const blocked = e.name === 'NoModificationAllowedError' || e.name === 'InvalidStateError' || e.name === 'NotAllowedError' || /lock|in use|being used/i.test(e.message);
      toast(blocked ? 'No pude escribir el archivo. ¿Está abierto en Excel? Ciérralo y vuelve a guardar.' : 'No se pudo guardar: ' + e.message, 'error');
    } finally { btn.disabled = false; }
  }

  async function unlink() {
    try {
      const h = await chooseHandle('Cambiar consolidado', `Elige otro ${MASTER_NAME} o crea uno nuevo con la estructura de 20 columnas.`);
      if (h) toast('Archivo vinculado: ' + h.name, 'ok');
    } catch (e) { if (e.name !== 'AbortError') toast(e.message, 'error'); }
  }

  // Libro nuevo con solo la fila del filtro actual.
  async function exportExcel() {
    if (!S.current) return;
    const { a, x } = S.current;
    const wb = buildExport(ExcelJS, a, x);
    const safe = (s) => s.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_');
    download(await wb.xlsx.writeBuffer(), `PyL_${safe(x.producto)}_${safe(x.periodo || 'periodo')}.xlsx`);
  }

  function init() {
    $('#btn-save').addEventListener('click', save);
    $('#btn-unlink').addEventListener('click', unlink);
    $('#btn-export').addEventListener('click', exportExcel);
    if (!consolidado.supported) $('#btn-unlink').classList.add('hidden');
    updateWho();
  }

  app.save = { init };
})();
