// Guardado rápido (Buscar producto): libreta de productos al vuelo con nombre, ID Dropi y foto.
// Solo valida y arma la lista; no calcula nada con ella. Sin DOM.
(() => {
  const core = globalThis.PYL.core;

  const clean = (v) => String(v == null ? '' : v).trim();

  // entry = { name, dropi }. Devuelve { ok: true } o { ok: false, msg }.
  // exceptId (opcional): ese producto no cuenta como ID repetido (al editarlo).
  const quickCheck = (items, entry, exceptId) => {
    const name = clean(entry && entry.name), dropi = clean(entry && entry.dropi);
    if (!name) return { ok: false, msg: 'Falta el nombre del producto.' };
    if (!dropi) return { ok: false, msg: 'Falta el ID Dropi.' };
    if ((items || []).some((x) => (exceptId == null || x.id !== exceptId) && clean(x.dropi) === dropi)) return { ok: false, msg: 'Ese ID ya está guardado.' };
    return { ok: true };
  };

  // Precio escrito a mano → pesos enteros. Acepta "25.000", "25000", "$ 25.000" o "25.000,50" (los centavos se descartan).
  // Devuelve null si no hay un monto mayor a cero.
  const quickPrice = (text) => {
    const digits = clean(text).replace(/,\d{1,2}$/, '').replace(/\D/g, '');
    const n = digits ? Number(digits) : 0;
    return n > 0 && Number.isSafeInteger(n) ? n : null;
  };

  // Lista nueva con el producto al inicio. No toca la lista recibida.
  // entry = { name, dropi, price? (pesos), photo? }.
  const quickAdd = (items, entry, now) => {
    const item = { id: String(now), name: clean(entry.name), dropi: clean(entry.dropi), createdAt: now };
    if (entry.price > 0) item.price = entry.price;
    if (entry.photo) item.photo = entry.photo;
    return [item, ...(items || [])];
  };

  // Lista nueva sin el producto de ese id. No toca la lista recibida.
  const quickRemove = (items, id) => (items || []).filter((x) => x.id !== id);

  // Lista nueva con el producto `id` reemplazado por entry = { name, dropi, price?, photo? }.
  // Conserva id, createdAt y posición; price/photo vacíos se quitan. Id inexistente → misma lista.
  const quickUpdate = (items, id, entry) => {
    const list = items || [];
    if (!list.some((x) => x.id === id)) return list;
    return list.map((x) => {
      if (x.id !== id) return x;
      const item = { id: x.id, name: clean(entry.name), dropi: clean(entry.dropi), createdAt: x.createdAt };
      if (entry.price > 0) item.price = entry.price;
      if (entry.photo) item.photo = entry.photo;
      return item;
    });
  };

  core.quick = { quickCheck, quickAdd, quickPrice, quickRemove, quickUpdate };
})();
