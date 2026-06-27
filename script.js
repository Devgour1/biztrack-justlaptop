function openSidebar() {
  var side = document.getElementById('sidebar');
  side.style.display = (side.style.display === "block") ? "none" : "block";
}
function closeSidebar() {
  document.getElementById('sidebar').style.display = 'none';
}

window.onload = function () {
  const expenses = JSON.parse(localStorage.getItem('bizTrackTransactions')) || [];
  const revenues = JSON.parse(localStorage.getItem('bizTrackOrders')) || [];

  const totalExpenses = expenses.reduce((t, e) => t + e.trAmount, 0);
  const totalRevenues = revenues.reduce((t, o) => t + o.orderTotal, 0);
  const totalBalance = totalRevenues - totalExpenses;
  const numOrders = revenues.length;

  document.getElementById('rev-amount').innerHTML = `
    <span class="title">Revenue</span>
    <span class="amount-value">₹${totalRevenues.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
  `;
  document.getElementById('exp-amount').innerHTML = `
    <span class="title">Expenses</span>
    <span class="amount-value">₹${totalExpenses.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
  `;
  document.getElementById('balance').innerHTML = `
    <span class="title">Balance</span>
    <span class="amount-value">₹${totalBalance.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
  `;
  document.getElementById('num-orders').innerHTML = `
    <span class="title">Sales</span>
    <span class="amount-value">${numOrders}</span>
  `;
};

function initializeChart() {
  const items = JSON.parse(localStorage.getItem('bizTrackProducts')) || [];

  // Group by brand
  const brandSales = {};
  items.forEach(p => {
    const brand = p.prodBrand || p.prodCat || 'Other';
    if (!brandSales[brand]) brandSales[brand] = 0;
    brandSales[brand] += (p.prodPrice || 0) * (p.prodSold || 0);
  });

  const sorted = Object.entries(brandSales).sort(([,a],[,b]) => b - a).reduce((acc,[k,v]) => ({...acc,[k]:v}), {});

  const barChartOptions = {
    series: [{ name: "Sales Value", data: Object.values(sorted) }],
    chart: { type: 'bar', height: 350, toolbar: {show:false} },
    theme: { palette: 'palette9' },
    plotOptions: { bar: { distributed:true, borderRadius:3, columnWidth:'50%' } },
    dataLabels: { enabled: false },
    legend: { show: false },
    fill: { opacity: 0.8 },
    xaxis: { categories: Object.keys(sorted), axisTicks:{show:false} },
    yaxis: {
      title: { text: 'Sales Value (₹)' },
      axisTicks: {show:false},
      labels: { formatter: v => '₹' + v.toLocaleString('en-IN') }
    },
    tooltip: { y: { formatter: v => '₹' + v.toLocaleString('en-IN') } }
  };

  new ApexCharts(document.querySelector('#bar-chart'), barChartOptions).render();

  // Expenses donut
  const expItems = JSON.parse(localStorage.getItem('bizTrackTransactions')) || [];
  const catExp = {};
  expItems.forEach(t => {
    catExp[t.trCategory] = (catExp[t.trCategory] || 0) + t.trAmount;
  });

  const donutOptions = {
    series: Object.values(catExp),
    labels: Object.keys(catExp),
    chart: { type:'donut', width:'100%', toolbar:{show:false} },
    theme: { palette:'palette1' },
    dataLabels: { enabled:true, style:{fontSize:'14px'} },
    plotOptions: { pie: { customScale:0.8, donut:{size:'60%'}, offsetY:20 } },
    legend: { position:'left', offsetY:55 },
    tooltip: { y: { formatter: v => '₹' + v.toLocaleString('en-IN') } }
  };

  new ApexCharts(document.querySelector('#donut-chart'), donutOptions).render();
}
