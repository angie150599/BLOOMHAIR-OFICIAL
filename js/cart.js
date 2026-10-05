// BloomHair — Módulo Carrito (localStorage + API Stripe)
(function () {
  const KEY = 'bh_cart_v1';

  const Cart = {
    read() {
      try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
      catch { return []; }
    },
    write(items) {
      localStorage.setItem(KEY, JSON.stringify(items));
      Cart.updateBadge();
      window.dispatchEvent(new CustomEvent('bh:cart-change'));
    },
    add({ sku, name, price, image, category, color, size, quantity = 1 }) {
      const items = Cart.read();
      const existing = items.find(i => i.sku === sku);
      if (existing) existing.quantity += quantity;
      else items.push({ sku, name, price, image, category, color, size, quantity });
      Cart.write(items);
    },
    remove(sku) {
      Cart.write(Cart.read().filter(i => i.sku !== sku));
    },
    setQuantity(sku, quantity) {
      const items = Cart.read();
      const item = items.find(i => i.sku === sku);
      if (!item) return;
      item.quantity = Math.max(1, Math.min(50, quantity | 0));
      Cart.write(items);
    },
    clear() { Cart.write([]); },
    count() { return Cart.read().reduce((s, i) => s + i.quantity, 0); },
    subtotal() { return Cart.read().reduce((s, i) => s + i.price * i.quantity, 0); },
    updateBadge() {
      const c = Cart.count();
      document.querySelectorAll('.cart-badge').forEach(b => {
        b.textContent = c;
        b.style.display = c > 0 ? 'flex' : 'none';
      });
    },
    async checkout() {
      const items = Cart.read();
      if (!items.length) {
        window.BH && BH.toast('Carrito vacío', 'Añade productos antes de pagar.');
        return;
      }
      try {
        const res = await fetch(`${window.BH_CONFIG.BACKEND_URL}/api/payments/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map(i => ({ sku: i.sku, quantity: i.quantity })),
            origin_url: window.location.origin,
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(err);
        }
        const data = await res.json();
        window.location.href = data.checkout_url;
      } catch (e) {
        console.error(e);
        window.BH && BH.toast('Error de pago', 'No se pudo iniciar el pago. Inténtalo de nuevo.');
      }
    },
  };

  window.BHCart = Cart;
  document.addEventListener('DOMContentLoaded', Cart.updateBadge);
})();
