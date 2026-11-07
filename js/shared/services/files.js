// Entrada y salida de archivos locales: leer reportes (.xlsx / .csv), elegir un archivo y descargar.
(() => {
  const PYL = globalThis.PYL;
  const services = (PYL.services ??= {});
  const { cellVal, parseCSV } = PYL.core.parse;

  const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  // Filas de la primera hoja (xlsx) o del CSV, como arreglos de valores planos.
  async function readRows(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.xls')) throw new Error('Formato .xls antiguo no soportado. Exporta como .xlsx o .csv.');
    if (name.endsWith('.xlsx')) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.worksheets[0];
      const out = [];
      ws.eachRow({ includeEmpty: false }, (row) => {
        const arr = [];
        for (let c = 1; c <= ws.columnCount; c++) arr.push(cellVal(row.getCell(c)));
        out.push(arr);
      });
      return out;
    }
    // CSV: UTF-8 por defecto; si aparecen caracteres inválidos, el archivo venía en Windows-1252.
    const buf = await file.arrayBuffer();
    let text = new TextDecoder('utf-8').decode(buf);
    if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf);
    return parseCSV(text);
  }

  // Selector de archivo clásico, para navegadores sin File System Access API.
  function pickXlsx() {
    return new Promise((res) => {
      const i = document.createElement('input'); i.type = 'file'; i.accept = '.xlsx';
      i.onchange = () => res(i.files[0] || null); i.click();
    });
  }

  function download(buf, name) {
    const url = URL.createObjectURL(new Blob([buf], { type: XLSX_MIME }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  // Foto de producto reducida a JPEG (lado mayor = max px) para que quepa en localStorage.
  function imageDataURL(file, max = 400, quality = 0.75) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onerror = () => rej(r.error);
      r.onload = () => {
        const img = new Image();
        img.onerror = () => rej(new Error('Imagen no válida'));
        img.onload = () => {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', quality));
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }

  services.files = { readRows, pickXlsx, download, imageDataURL, XLSX_MIME };
})();
