function openSidebar() {
  var side = document.getElementById('sidebar');
  side.style.display = (side.style.display === "block") ? "none" : "block";
}
function closeSidebar() { document.getElementById('sidebar').style.display = 'none'; }
function openForm() {
  var form = document.getElementById("product-form");
  form.style.display = (form.style.display === "block") ? "none" : "block";
}
function closeForm() { document.getElementById("product-form").style.display = "none"; }

let products = [];

function init() {
  const stored = localStorage.getItem("bizTrackProducts");
  if (stored) {
    products = JSON.parse(stored);
  } else {
    // Just Laptop sample data
    products = [
      { prodID:"JL001", prodBrand:"Dell", prodName:"Inspiron 15 3000", prodDesc:"Intel Core i5 10th Gen", prodRam:"8GB", prodStorage:"256GB SSD", prodDisplay:'15.6"', prodCat:"Good", prodPrice:16500, prodCost:13000, prodSold:2, prodNotes:"Windows 11 activated" },
      { prodID:"JL002", prodBrand:"HP", prodName:"Pavilion 14", prodDesc:"Intel Core i3 8th Gen", prodRam:"8GB", prodStorage:"512GB SSD", prodDisplay:'14"', prodCat:"Excellent", prodPrice:14000, prodCost:11000, prodSold:1, prodNotes:"Like new condition" },
      { prodID:"JL003", prodBrand:"Lenovo", prodName:"ThinkPad E14", prodDesc:"Intel Core i5 11th Gen", prodRam:"16GB", prodStorage:"512GB SSD", prodDisplay:'14"', prodCat:"Excellent", prodPrice:22000, prodCost:18000, prodSold:1, prodNotes:"Business grade" },
      { prodID:"JL004", prodBrand:"Apple", prodName:"MacBook Air M1", prodDesc:"Apple M1 Chip", prodRam:"8GB", prodStorage:"256GB SSD", prodDisplay:'13.3"', prodCat:"Good", prodPrice:55000, prodCost:48000, prodSold:1, prodNotes:"Battery health 89%" },
      { prodID:"JL005", prodBrand:"Asus", prodName:"VivoBook 15", prodDesc:"AMD Ryzen 5 5500U", prodRam:"8GB", prodStorage:"512GB SSD", prodDisplay:'15.6"', prodCat:"Fair", prodPrice:18000, prodCost:14500, prodSold:3, prodNotes:"Minor keyboard wear" },
    ];
    localStorage.setItem("bizTrackProducts", JSON.stringify(products));
  }
  renderProducts(products);
}

function addOrUpdate(event) {
  let type = document.getElementById("submitBtn").textContent;
  if (type === 'Add to Stock') newProduct(event);
  else updateProduct(document.getElementById("product-id").value);
}

function newProduct(event) {
  event.preventDefault();
  const prodID = document.getElementById("product-id").value.trim();
  if (isDuplicateID(prodID, null)) { alert("Stock ID already exists!"); return; }

  const product = collectForm(prodID);
  products.push(product);
  localStorage.setItem("bizTrackProducts", JSON.stringify(products));
  renderProducts(products);
  document.getElementById("product-form").reset();
  closeForm();
}

function collectForm(prodID) {
  return {
    prodID,
    prodBrand:   document.getElementById("product-brand").value,
    prodName:    document.getElementById("product-name").value.trim(),
    prodDesc:    document.getElementById("product-desc").value.trim(),
    prodRam:     document.getElementById("product-ram").value,
    prodStorage: document.getElementById("product-storage").value,
    prodDisplay: document.getElementById("product-display").value,
    prodCat:     document.getElementById("product-cat").value,
    prodPrice:   parseFloat(document.getElementById("product-price").value) || 0,
    prodCost:    parseFloat(document.getElementById("product-cost").value) || 0,
    prodSold:    parseInt(document.getElementById("product-sold").value) || 0,
    prodNotes:   document.getElementById("product-notes").value.trim(),
  };
}

function conditionBadge(c) {
  const map = { Excellent:'condition-excellent', Good:'condition-good', Fair:'condition-fair', Poor:'condition-poor' };
  return `<span class="${map[c]||'condition-fair'}">${c}</span>`;
}

function renderProducts(list) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#999;padding:2rem;">No laptops in stock. Add your first laptop!</td></tr>';
    return;
  }
  list.forEach(p => {
    const tr = document.createElement("tr");
    tr.className = "product-row";
    tr.dataset.prodID = p.prodID;
    tr.dataset.prodBrand = p.prodBrand || '';
    tr.dataset.prodName = p.prodName;
    tr.dataset.prodDesc = p.prodDesc;
    tr.dataset.prodCat = p.prodCat;
    tr.dataset.prodPrice = p.prodPrice;
    tr.dataset.prodSold = p.prodSold;

    const profit = p.prodCost > 0 ? `<br><small style="color:#16a34a;">+₹${(p.prodPrice - p.prodCost).toLocaleString('en-IN')} margin</small>` : '';
    const stockColor = p.prodSold > 0 ? 'stock-in' : 'stock-out';
    const stockText = p.prodSold > 0 ? p.prodSold + ' pcs' : 'Out of Stock';

    tr.innerHTML = `
      <td><b>${p.prodID}</b></td>
      <td><span class="brand-tag">${p.prodBrand||'—'}</span></td>
      <td><b>${p.prodName}</b></td>
      <td>${p.prodDesc}</td>
      <td>
        <span class="spec-chip">🧠 ${p.prodRam||'—'}</span>
        <span class="spec-chip">💾 ${p.prodStorage||'—'}</span>
        <span class="spec-chip">🖥 ${p.prodDisplay||'—'}</span>
        ${p.prodNotes ? `<br><small style="color:#94a3b8;">${p.prodNotes}</small>` : ''}
      </td>
      <td>${conditionBadge(p.prodCat)}</td>
      <td><b>₹${p.prodPrice.toLocaleString('en-IN')}</b>${profit}</td>
      <td class="${stockColor}">${stockText}</td>
      <td class="action">
        <i title="Edit" onclick="editRow('${p.prodID}')" class="edit-icon fa-solid fa-pen-to-square"></i>
        <i onclick="deleteProduct('${p.prodID}')" class="delete-icon fas fa-trash-alt"></i>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editRow(prodID) {
  const p = products.find(x => x.prodID === prodID);
  if (!p) return;
  document.getElementById("product-id").value = p.prodID;
  document.getElementById("product-brand").value = p.prodBrand || '';
  document.getElementById("product-name").value = p.prodName;
  document.getElementById("product-desc").value = p.prodDesc;
  document.getElementById("product-ram").value = p.prodRam || '8GB';
  document.getElementById("product-storage").value = p.prodStorage || '256GB SSD';
  document.getElementById("product-display").value = p.prodDisplay || '15.6"';
  document.getElementById("product-cat").value = p.prodCat;
  document.getElementById("product-price").value = p.prodPrice;
  document.getElementById("product-cost").value = p.prodCost || '';
  document.getElementById("product-sold").value = p.prodSold;
  document.getElementById("product-notes").value = p.prodNotes || '';
  document.getElementById("submitBtn").textContent = "Update";
  document.getElementById("product-form").style.display = "block";
}

function deleteProduct(prodID) {
  if (!confirm("Delete " + prodID + " from stock?")) return;
  products = products.filter(p => p.prodID !== prodID);
  localStorage.setItem("bizTrackProducts", JSON.stringify(products));
  renderProducts(products);
}

function updateProduct(prodID) {
  const idx = products.findIndex(p => p.prodID === prodID);
  if (idx === -1) return;
  const updated = collectForm(prodID);
  if (isDuplicateID(updated.prodID, prodID)) { alert("Stock ID already exists!"); return; }
  products[idx] = updated;
  localStorage.setItem("bizTrackProducts", JSON.stringify(products));
  renderProducts(products);
  document.getElementById("product-form").reset();
  document.getElementById("submitBtn").textContent = "Add to Stock";
  closeForm();
}

function isDuplicateID(id, currentID) {
  return products.some(p => p.prodID === id && p.prodID !== currentID);
}

function sortTable(col) {
  const tbody = document.getElementById("tableBody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const isNum = col === "prodPrice" || col === "prodSold";
  rows.sort((a, b) => {
    const av = isNum ? parseFloat(a.dataset[col]) : (a.dataset[col]||'');
    const bv = isNum ? parseFloat(b.dataset[col]) : (b.dataset[col]||'');
    return isNum ? av - bv : av.localeCompare(bv, undefined, {sensitivity:'base'});
  }).forEach(r => tbody.appendChild(r));
}

document.getElementById("searchInput").addEventListener("keyup", function() {
  const q = this.value.toLowerCase();
  document.querySelectorAll(".product-row").forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(q) ? "" : "none";
  });
});

function exportToCSV() {
  const rows = products.map(p => [
    p.prodID, p.prodBrand, p.prodName, p.prodDesc,
    p.prodRam, p.prodStorage, p.prodDisplay, p.prodCat,
    p.prodPrice, p.prodCost, p.prodSold, p.prodNotes
  ].join(','));
  const header = "Stock ID,Brand,Model,Processor,RAM,Storage,Display,Condition,Sell Price,Cost Price,Stock,Notes";
  const blob = new Blob([header + "\n" + rows.join("\n")], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'justlaptop_inventory.csv';
  a.click();
}

init();
