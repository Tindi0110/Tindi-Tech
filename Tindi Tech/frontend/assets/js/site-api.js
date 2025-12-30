/**
 * site-api.js
 * Universal logic to connect Tindi Tech frontend pages to the Python Backend
 */

// ============== API CONFIGURATION ==============
function getApiUrl() {
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '') {
    return 'https://api.tinditech.com'; // Production URL
  }
  return 'http://127.0.0.1:5000'; // Development URL
}
const API_URL = getApiUrl();
window.API_URL = API_URL; // EXPORT GLOBAL


// ============== 1. GLOBAL QUOTE MODAL SYSTEM ==============
// Injects the modal HTML into the page automatically
function injectQuoteModal() {
  if (document.getElementById('globalQuoteModal')) return;

  const modalHTML = `
  <div id="globalQuoteModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; backdrop-filter:blur(5px); align-items:center; justify-content:center;">
    <div class="modal-content" style="background:white; padding:30px; border-radius:15px; width:90%; max-width:500px; position:relative; box-shadow: 0 10px 30px rgba(0,0,0,0.2); animation: slideUp 0.3s ease-out;">
      <span class="close-modal" onclick="closeQuoteModal()" style="position:absolute; top:15px; right:20px; font-size:24px; cursor:pointer; color:#777;">&times;</span>
      
      <h2 style="color:var(--primary-color, #007bff); text-align:center; margin-bottom:10px;">Get a Free Quote</h2>
      <p style="text-align:center; color:#666; margin-bottom:20px;">Tell us about your project needs.</p>
      
      <form id="globalQuoteForm">
        <div style="margin-bottom:15px;">
          <input type="text" name="name" placeholder="Your Name" required style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; font-size:16px;">
        </div>
        <div style="margin-bottom:15px;">
          <input type="email" name="email" placeholder="Email Address" required style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; font-size:16px;">
        </div>
        <div style="margin-bottom:15px;">
          <input type="tel" name="phone" placeholder="Phone Number" required style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; font-size:16px;">
        </div>
        <div style="margin-bottom:15px;">
           <select name="service" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; font-size:16px; background:white;">
              <option value="General">General Inquiry</option>
              <option value="Networking">Networking & Cabling</option>
              <option value="CCTV">CCTV & Security</option>
              <option value="Web Design">Web Design / Development</option>
              <option value="Starlink">Starlink Installation</option>
           </select>
        </div>
        <div style="margin-bottom:20px;">
          <textarea name="message" rows="4" placeholder="Describe your requirements..." required style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; font-size:16px; font-family:inherit;"></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%; padding:12px; font-size:18px; border:none; border-radius:8px; background:var(--primary-color, #007bff); color:white; cursor:pointer; font-weight:bold; transition: opacity 0.3s;">
          Request Quote
        </button>
      </form>
    </div>
  </div>
  <style>
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  </style>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Setup Form Listener
  document.getElementById('globalQuoteForm').addEventListener('submit', handleQuoteSubmit);
}

window.openQuoteModal = function () {
  const modal = document.getElementById('globalQuoteModal');
  if (modal) modal.style.display = 'flex';
}

window.closeQuoteModal = function () {
  const modal = document.getElementById('globalQuoteModal');
  if (modal) modal.style.display = 'none';
}

// Hijack all links to quote.html
function initGlobalQuoteLinks() {
  document.querySelectorAll('a[href="quote.html"], a[href="quote.html#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openQuoteModal();
    });
  });
}

// Global Form Handler
async function handleQuoteSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.innerText;

  btn.innerText = 'Sending...';
  btn.style.opacity = '0.7';
  btn.disabled = true;

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch(`${API_URL}/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();

    if (json.success) {
      alert('✅ Request Received!\n\nWe have received your quote request and will contact you shortly.');
      form.reset();
      closeQuoteModal();
    } else {
      alert('❌ Error: ' + (json.error || 'Unknown error occurred'));
    }
  } catch (err) {
    console.error(err);
    alert('⚠️ Connection Failed. Please ensure the backend is running.');
  } finally {
    btn.innerText = originalText;
    btn.style.opacity = '1';
    btn.disabled = false;
  }
}

// ============== 2. PRODUCT FETCHING ==============
async function fetchProducts(query = '') {
  const container = document.querySelector('.products-grid');
  if (!container) return;

  container.innerHTML = '<p class="text-center" style="width: 100%; padding: 40px; color:#666;">Loading premium products...</p>';
  try {
    const url = query ? `${API_URL}/products?search=${encodeURIComponent(query)}` : `${API_URL}/products`;
    const response = await fetch(url);
    const json = await response.json();

    if (json.success && json.data.length > 0) {
      container.innerHTML = '';
      window.allProducts = json.data;

      function escapeHtml(text) {
        if (!text) return text;
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }

      json.data.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';

        // Stock Logic
        const stock = (product.stock !== undefined && product.stock !== null) ? parseInt(product.stock) : 0;
        const isOutOfStock = stock <= 0;

        // Indirect Stock Display
        let stockDisplay = '';
        if (isOutOfStock) {
          stockDisplay = `<div style="color:#dc3545; font-weight:bold; font-size:0.9em; margin-bottom:5px;">Out of Stock</div>`;
        } else if (stock > 10) {
          stockDisplay = `<div style="color:#28a745; font-weight:bold; font-size:0.9em; margin-bottom:5px;">In Stock (10+ available)</div>`;
        } else {
          stockDisplay = `<div style="color:#d39e00; font-weight:bold; font-size:0.9em; margin-bottom:5px;">Low Stock (Only ${stock} left!)</div>`;
        }

        // Quantity Input & Button
        let actionHtml = '';
        if (isOutOfStock) {
          actionHtml = `<button class="btn btn-primary" style="padding: 5px 12px; opacity:0.6; cursor:not-allowed;" disabled>Out of Stock</button>`;
        } else {
          actionHtml = `
            <div style="display:flex; align-items:center; gap:5px; justify-content:center;">
                <input type="number" id="qty-${product._id || product.id}" value="1" min="1" max="${stock}" style="width:50px; padding:5px; border:1px solid #ddd; border-radius:4px;">
                <button class="btn btn-primary" style="padding: 5px 12px;" 
                    onclick="addToCart('${escapeHtml(product.name)}', ${product.price}, '${escapeHtml(product.image)}', ${stock}, document.getElementById('qty-${product._id || product.id}').value)">
                  Add to Cart
                </button>
            </div>
            `;
        }

        card.innerHTML = `
          <div class="product-img-wrapper">
            <img src="${product.image || 'img/pics/default-product.png'}" class="product-img" alt="${escapeHtml(product.name)}">
          </div>
          <div class="product-info">
            <h3>${escapeHtml(product.name)}</h3>
            <div class="product-price">${parseFloat(product.price).toLocaleString()} KES</div>
            <div class="product-category">${escapeHtml(product.category || 'Product')}</div>
            ${stockDisplay}
            
            <div style="margin-top: 10px;">
                ${actionHtml}
                <button class="btn btn-outline" style="padding: 5px 12px; margin-top:5px; width:100%;" onclick="openDetailModal('${product._id || product.id}')">
                   View More
                </button>
            </div>
          </div>
        `;
        container.appendChild(card);
      });
    } else {
      container.innerHTML = '<p class="text-center" style="width: 100%;">No products found.</p>';
    }
  } catch (error) {
    console.error("Failed to load products:", error);
    container.innerHTML = `<div style="text-align:center; color:#721c24; background-color:#f8d7da; border-color:#f5c6cb; padding:20px; border-radius:5px; margin:20px;">
        <h3>⚠️ Connection Failed</h3>
        <p>Could not load products. Please ensure the backend server is running.</p>
        <code style="display:block; margin-top:10px; font-size:0.8em;">Target: ${API_URL}</code>
    </div>`;
  }
}

// ============== 3. CONTACT FORM ==============
function setupContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', handleQuoteSubmit); // Reuse logic if fields match, or simple fetch
}

// ============== 4. CART & MODAL UTILS ==============
window.addToCart = function (name, price, image, maxStock, qtyToAdd) {
  try {
    let cart = [];

    // Ensure strict types
    const qty = parseInt(qtyToAdd, 10);
    const limit = parseInt(maxStock, 10);

    if (!qty || qty < 1) return alert("Please enter a valid quantity.");

    // Direct limit check (Initial add)
    if (qty > limit) {
      alert(`Sorry, you cannot order more than ${limit} items.\n(Available Stock: ${limit})`);
      return;
    }

    try { cart = JSON.parse(localStorage.getItem("cart")) || []; } catch (e) { }

    const existing = cart.find(i => i.name === name);

    if (existing) {
      const currentQty = parseInt(existing.quantity, 10) || 0;
      const newTotal = currentQty + qty;

      // Check total limit
      if (newTotal > limit) {
        alert(`Stock Limit Reached!\n\nYou already have ${currentQty} in your cart.\nAdding ${qty} would exceed the available stock of ${limit}.`);
        return;
      }
      existing.quantity = newTotal;
      // Update maxStock in case it changed
      existing.maxStock = limit;
    }
    else {
      cart.push({ name, price, image, quantity: qty, maxStock: limit });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    alert(`${qtyToAdd} x ${name} added to cart!`);
    updateCartCount();
  } catch (err) {
    console.error(err);
    alert("Unable to add item to cart. Please try again.");
  }
};

function updateCartCount() {
  const el = document.getElementById('cart-count');
  if (el) {
    let cart = [];
    try { cart = JSON.parse(localStorage.getItem("cart")) || []; } catch (e) { }
    el.innerText = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);
  }
}

// Product Detail Modal
window.openDetailModal = function (id) {
  const product = (window.allProducts || []).find(p => (p._id || p.id) === id);
  if (!product) return;
  const modal = document.getElementById('productDetailModal');
  if (!modal) return;

  document.getElementById('detailImg').src = product.image || 'img/pics/default-product.png';
  document.getElementById('detailName').innerText = product.name;
  document.getElementById('detailPrice').innerText = parseFloat(product.price).toLocaleString() + ' KES';
  document.getElementById('detailDesc').innerText = product.description || 'No description.';

  const addBtn = document.getElementById('detailAddBtn');
  const stock = (product.stock !== undefined && product.stock !== null) ? parseInt(product.stock) : 0;

  // Detail Modal Stock Display
  if (stock <= 0) {
    addBtn.innerText = "Out of Stock";
    addBtn.disabled = true;
    addBtn.style.opacity = "0.6";
    addBtn.style.cursor = "not-allowed";
    addBtn.onclick = null;
  } else {
    addBtn.innerText = "Add to Cart";
    addBtn.disabled = false;
    addBtn.style.opacity = "1";
    addBtn.style.cursor = "pointer";
    addBtn.onclick = () => {
      addToCart(product.name, product.price, product.image, stock);
      modal.style.display = 'none';
    };
  }
  modal.style.display = 'flex';
};

window.closeDetailModal = function () {
  const modal = document.getElementById('productDetailModal');
  if (modal) modal.style.display = 'none';
};

// Close modals on outside click
window.onclick = function (event) {
  const modals = ['productDetailModal', 'globalQuoteModal', 'productModal']; // List of all possible modals
  modals.forEach(id => {
    const modal = document.getElementById(id);
    if (modal && event.target == modal) {
      modal.style.display = "none";
    }
  });
};

// ============== INITIALIZATION ==============
document.addEventListener('DOMContentLoaded', () => {
  injectQuoteModal(); // Create the modal HTML
  initGlobalQuoteLinks(); // Hijack links
  fetchProducts(); // Load shop
  updateCartCount(); // Update badge
});
