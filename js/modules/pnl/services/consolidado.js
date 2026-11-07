// Archivo consolidado vinculado (File System Access API, solo Chrome/Edge).
// El handle se recuerda en IndexedDB; el navegador solo pide confirmar el permiso.
(() => {
  const PYL = globalThis.PYL;
  const services = (PYL.services ??= {});
  const { idb } = services.storage;
  const { XLSX_MIME } = services.files;

  const supported = 'showOpenFilePicker' in window;
  const XLSX_TYPES = [{ description: 'Excel', accept: { [XLSX_MIME]: ['.xlsx'] } }];
  const MASTER_NAME = 'Utilidad_Consolidado_Global.xlsx';
  let handle = null;

  const remember = async (h) => { handle = h; await idb.set('master', h); return h; };

  // Elegir un consolidado existente.
  async function pick() {
    const [h] = await window.showOpenFilePicker({ id: 'consolidado', types: XLSX_TYPES });
    return remember(h);
  }

  // Crea un consolidado nuevo con la plantilla de 20 columnas en la ubicación que elija el usuario.
  async function create() {
    const h = await window.showSaveFilePicker({ id: 'consolidado', suggestedName: MASTER_NAME, types: XLSX_TYPES });
    const w = await h.createWritable();
    await w.write(await PYL.core.excel.buildTemplate(ExcelJS).xlsx.writeBuffer()); await w.close();
    return remember(h);
  }

  // Handle en memoria o recuperado de IndexedDB (null si nunca se vinculó).
  async function restore() {
    handle = handle || (await idb.get('master'));
    return handle;
  }

  // Handle actual sin modificar el estado, para mostrar qué archivo está vinculado.
  const linked = async () => handle || (supported ? await idb.get('master') : null);
  const current = () => handle;

  async function ensureWrite(h) {
    let perm = await h.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') perm = await h.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') throw new Error('Sin permiso de escritura sobre el archivo.');
    return h;
  }

  services.consolidado = { supported, MASTER_NAME, pick, create, restore, linked, current, ensureWrite };
})();
