document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  // Auth Protection: Token illana login page-ku redirect aagum
  if (!token || !user) {
    window.location.href = 'login.html';
    return;
  }

  // Set User details in UI
  document.getElementById('nav-username').textContent = `@${user.username}`;
  document.getElementById('user-name-display').textContent = user.username;
  document.getElementById('user-category-display').textContent = user.category;

  // Render dummy items based on selected category
  loadCategoryProducts(user.category);

  // Logout Functionality
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  });
});

function loadCategoryProducts(category) {
  const container = document.getElementById('product-container');

  // Dummy product dataset based on user category choice
  const sampleProducts = {
    'Electronics': ['Wireless Headphones', 'Gaming Mouse', 'Smart Watch', 'Bluetooth Speaker'],
    'Fashion': ['Men Casual Shirt', 'Denim Jacket', 'Running Shoes', 'Leather Watch'],
    'Groceries': ['Organic Honey', 'Almonds & Nuts', 'Green Tea', 'Extra Virgin Olive Oil'],
    'Books': ['Clean Code', 'JavaScript: The Good Parts', 'Atomic Habits', 'The Pragmatic Programmer'],
    'Home & Kitchen': ['Coffee Maker', 'Air Fryer', 'Desk Lamp', 'Non-stick Cookware Set']
  };

  const products = sampleProducts[category] || ['Generic Product 1', 'Generic Product 2'];

  container.innerHTML = products.map(item => `
    <div class="col-md-3 mb-4">
      <div class="card h-100 shadow-sm border-0">
        <div class="card-body d-flex flex-column justify-content-between">
          <h5 class="card-title fw-bold">${item}</h5>
          <p class="card-text text-muted">Category: ${category}</p>
          <button class="btn btn-outline-primary w-100 mt-2">Buy Now</button>
        </div>
      </div>
    </div>
  `).join('');

  document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  // Auth Protection: Token illana login page-ku redirect aagum
  if (!token || !user) {
    window.location.href = 'login.html';
    return;
  }

  // Set User details in UI
  document.getElementById('nav-username').textContent = `@${user.username}`;
  document.getElementById('user-name-display').textContent = user.username;
  document.getElementById('user-category-display').textContent = user.category;

  // Render dummy items based on selected category
  loadCategoryProducts(user.category);

  // Add Product Button Click Handler
  document.getElementById('addProductBtn').addEventListener('click', () => {
    // Get product details from the form (from your screenshot)
    const productName = document.getElementById('productName')?.value || 'shirt';
    const category = document.getElementById('category')?.value || 'Electronics';
    const subCategory = document.getElementById('subCategory')?.value || 'tshirt';
    const price = document.getElementById('price')?.value || '999';
    const discount = document.getElementById('discount')?.value || '10';
    const stock = document.getElementById('stock')?.value || '20';
    const description = document.getElementById('description')?.value || 'Describe your product...';
    
    // For image - we'll use a placeholder or get from file input
    const imageInput = document.getElementById('imageUpload');
    let imageUrl = 'https://via.placeholder.com/400x400?text=Product+Image';
    
    if (imageInput && imageInput.files && imageInput.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) {
        imageUrl = e.target.result;
        showProductDetails(productName, category, subCategory, price, discount, stock, description, imageUrl);
      };
      reader.readAsDataURL(imageInput.files[0]);
    } else {
      showProductDetails(productName, category, subCategory, price, discount, stock, description, imageUrl);
    }
  });

  // Logout Functionality
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  });
});

// Function to show product details in modal
function showProductDetails(name, category, subCategory, price, discount, stock, description, imageUrl) {
  document.getElementById('modal-product-name').textContent = name;
  document.getElementById('modal-product-category').textContent = `Category: ${category}`;
  document.getElementById('modal-product-subcategory').textContent = `Sub-Category: ${subCategory}`;
  document.getElementById('modal-product-price').textContent = `₮${price}`;
  document.getElementById('modal-product-discount').textContent = discount;
  document.getElementById('modal-product-stock').textContent = stock;
  document.getElementById('modal-product-description').textContent = description;
  document.getElementById('modal-product-image').src = imageUrl;
  
  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById('productDetailModal'));
  modal.show();
}

function loadCategoryProducts(category) {
  const container = document.getElementById('product-container');

  // Dummy product dataset based on user category choice
  const sampleProducts = {
    'Electronics': ['Wireless Headphones', 'Gaming Mouse', 'Smart Watch', 'Bluetooth Speaker'],
    'Fashion': ['Men Casual Shirt', 'Denim Jacket', 'Running Shoes', 'Leather Watch'],
    'Groceries': ['Organic Honey', 'Almonds & Nuts', 'Green Tea', 'Extra Virgin Olive Oil'],
    'Books': ['Clean Code', 'JavaScript: The Good Parts', 'Atomic Habits', 'The Pragmatic Programmer'],
    'Home & Kitchen': ['Coffee Maker', 'Air Fryer', 'Desk Lamp', 'Non-stick Cookware Set']
  };

  const products = sampleProducts[category] || ['Generic Product 1', 'Generic Product 2'];

  container.innerHTML = products.map(item => `
    <div class="col-md-3 mb-4">
      <div class="card h-100 shadow-sm border-0">
        <div class="card-body d-flex flex-column justify-content-between">
          <h5 class="card-title fw-bold">${item}</h5>
          <p class="card-text text-muted">Category: ${category}</p>
          <button class="btn btn-outline-primary w-100 mt-2" onclick="showProductDetails('${item}', '${category}', 'N/A', '999', '10', '20', 'Premium quality product', 'https://via.placeholder.com/400x400?text=${item}')">Buy Now</button>
        </div>
      </div>
    </div>
  `).join('');
}
}