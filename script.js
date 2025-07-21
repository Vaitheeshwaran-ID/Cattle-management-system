// script.js
let settings = { price: 0, cost: 0 }, records = [], data = {};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    load();
    updateStatus();
    setInterval(updateStatus, 30000);
});

function store() {
    try {
        data = { settings, records, timestamp: new Date().toISOString(), version: '1.0' };
        window.appData = data;
        updateStatus();
        return true;
    } catch (e) {
        alert('Error saving data', 'error');
        return false;
    }
}

function load() {
    try {
        if (window.appData) {
            data = window.appData;
            settings = data.settings || { price: 0, cost: 0 };
            records = data.records || [];
            document.getElementById('price').value = settings.price || '';
            document.getElementById('cost').value = settings.cost || '';
            alert('Data loaded successfully!', 'success');
        } else {
            settings = { price: 0, cost: 0 };
            records = [];
            alert('Welcome! Please set up your milk price and feed cost.', 'info');
        }
        updateStatus();
        return true;
    } catch (e) {
        alert('Error loading data. Starting fresh.', 'warning');
        return false;
    }
}

function backup() {
    try {
        const b = { settings, records, timestamp: new Date().toISOString(), version: '1.0', recordCount: records.length };
        const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cattle-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        alert('Backup created successfully!', 'success');
        updateStatus();
    } catch (e) {
        alert('Error creating backup. Please try again.', 'error');
    }
}

function restore(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const b = JSON.parse(e.target.result);
            if (!b.settings || !b.records) throw new Error('Invalid backup file format');
            if (records.length > 0 && !confirm(`This will replace your current data (${records.length} records) with backup data (${b.records.length} records). Continue?`)) return;
            settings = b.settings;
            records = b.records;
            document.getElementById('price').value = settings.price || '';
            document.getElementById('cost').value = settings.cost || '';
            store();
            updateStatus();
            alert(`Backup restored successfully! ${records.length} records loaded.`, 'success');
        } catch (err) {
            alert('Error restoring backup. Please check the file.', 'error');
        }
    };
    reader.readAsText(file);
    input.value = '';
}

function clear() {
    if (!confirm(`Are you sure you want to delete all data? This will remove ${records.length} records and cannot be undone.`)) return;
    settings = { price: 0, cost: 0 };
    records = [];
    document.getElementById('price').value = '';
    document.getElementById('cost').value = '';
    document.getElementById('morning').value = '';
    document.getElementById('evening').value = '';
    document.getElementById('report').style.display = 'none';
    store();
    updateStatus();
    alert('All data cleared successfully!', 'success');
}

function updateStatus() {
    const st = document.getElementById('st');
    const ls = document.getElementById('ls');
    if (window.appData && window.appData.timestamp) {
        const lastSaved = new Date(window.appData.timestamp);
        const now = new Date();
        const diff = Math.floor((now - lastSaved) / (1000 * 60));
        if (diff < 1) {
            ls.textContent = 'Just now';
        } else if (diff < 60) {
            ls.textContent = `${diff} minutes ago`;
        } else if (diff < 1440) {
            ls.textContent = `${Math.floor(diff / 60)} hours ago`;
        } else {
            ls.textContent = lastSaved.toLocaleDateString();
        }
    } else {
        ls.textContent = 'Never';
    }
    st.textContent = 'Auto-save enabled';
    document.getElementById('rc').textContent = records.length;
}

function saveSettings() {
    const price = parseFloat(document.getElementById('price').value);
    const cost = parseFloat(document.getElementById('cost').value);
    if (!price || !cost) {
        alert('Please enter both milk price and feed cost', 'error');
        return;
    }
    settings = { price, cost };
    store();
    alert('Settings saved successfully!', 'success');
}

function addRecord() {
    const date = document.getElementById('date').value;
    const morning = parseFloat(document.getElementById('morning').value) || 0;
    const evening = parseFloat(document.getElementById('evening').value) || 0;
    if (!date || (morning + evening) === 0) {
        alert('Please enter date and milk production', 'error');
        return;
    }
    const total = morning + evening;
    const revenue = total * settings.price;
    const index = records.findIndex(r => r.date === date);
    if (index !== -1) {
        records[index] = { date, morning, evening, total, revenue };
    } else {
        records.push({ date, morning, evening, total, revenue });
    }
    records.sort((a, b) => new Date(a.date) - new Date(b.date));
    store();
    alert('Record added successfully!', 'success');
    document.getElementById('morning').value = '';
    document.getElementById('evening').value = '';
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    document.getElementById('date').value = next.toISOString().split('T')[0];
}

function generateReport() {
    if (records.length === 0) {
        alert('No records found. Please add some data first.', 'error');
        return;
    }
    if (settings.price === 0) {
        alert('Please set milk price first.', 'error');
        return;
    }
    const totalMilk = records.reduce((s, r) => s + r.total, 0);
    const totalRevenue = records.reduce((s, r) => s + r.revenue, 0);
    const weeks = Math.ceil(records.length / 7);
    const totalCost = weeks * settings.cost;
    const netProfit = totalRevenue - totalCost;
    
    document.getElementById('totalMilk').textContent = totalMilk.toFixed(1);
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toFixed(2)}`;
    document.getElementById('totalCost').textContent = `₹${totalCost.toFixed(2)}`;
    document.getElementById('netProfit').textContent = `₹${netProfit.toFixed(2)}`;
    document.getElementById('netProfit').className = `mv ${netProfit >= 0 ? 'profit' : 'loss'}`;
    
    drawChart();
    populateTable();
    document.getElementById('report').style.display = 'block';
    alert(`Report generated! ${netProfit >= 0 ? 'Profit' : 'Loss'}: ₹${Math.abs(netProfit).toFixed(2)}`, 'success');
}

function drawChart() {
    const chart = document.getElementById('chart');
    chart.innerHTML = '';
    if (records.length === 0) return;
    const max = Math.max(...records.map(r => r.total));
    records.forEach(record => {
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = `${(record.total / max) * 180}px`;
        bar.style.flex = '1';
        
        const label = document.createElement('div');
        label.className = 'bl';
        label.textContent = new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' });
        
        const value = document.createElement('div');
        value.className = 'bv';
        value.textContent = `${record.total.toFixed(1)}L`;
        
        bar.appendChild(label);
        bar.appendChild(value);
        chart.appendChild(bar);
    });
}

function populateTable() {
    const tbody = document.getElementById('tbody');
    tbody.innerHTML = '';
    records.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(record.date).toLocaleDateString('en-IN')}</td>
            <td>${record.morning.toFixed(1)}</td>
            <td>${record.evening.toFixed(1)}</td>
            <td>${record.total.toFixed(1)}</td>
            <td>₹${record.revenue.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}

function download() {
    if (records.length === 0) {
        alert('No data to download', 'error');
        return;
    }
    const totalMilk = records.reduce((s, r) => s + r.total, 0);
    const totalRevenue = records.reduce((s, r) => s + r.revenue, 0);
    const weeks = Math.ceil(records.length / 7);
    const totalCost = weeks * settings.cost;
    const netProfit = totalRevenue - totalCost;
    
    let csv = "Cattle Management Report\n\n";
    csv += "SUMMARY\n";
    csv += `Total Milk Production,${totalMilk.toFixed(1)} Liters\n`;
    csv += `Total Revenue,₹${totalRevenue.toFixed(2)}\n`;
    csv += `Total Cost,₹${totalCost.toFixed(2)}\n`;
    csv += `Net ${netProfit >= 0 ? 'Profit' : 'Loss'},₹${Math.abs(netProfit).toFixed(2)}\n\n`;
    csv += "DAILY RECORDS\n";
    csv += "Date,Morning (L),Evening (L),Total (L),Revenue (₹)\n";
    records.forEach(r => {
        csv += `${r.date},${r.morning},${r.evening},${r.total},${r.revenue.toFixed(2)}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cattle-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    alert('Report downloaded successfully!', 'success');
}

function alert(msg, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `a a${type[0]}`;
    alertDiv.textContent = msg;
    document.getElementById('alerts').appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 4000);
}

function multiReport() {
    if (records.length === 0) {
        alert('No records found. Please add some data first.', 'error');
        return;
    }
    document.getElementById('multi').style.display = 'block';
    updateMulti();
}

function updateMulti() {
    const period = document.getElementById('period').value;
    const periods = groupByPeriod(records, period);
    displayMultiMetrics(periods);
    displayMultiChart(periods);
    displayMultiTable(periods);
}

function groupByPeriod(records, period) {
    const groups = {};
    records.forEach(r => {
        const date = new Date(r.date);
        let key;
        if (period === 'weekly') {
            const week = getWeekNumber(date);
            key = `${date.getFullYear()}-W${week}`;
        } else if (period === 'monthly') {
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            key = `${date.getFullYear()}-Q${quarter}`;
        }
        if (!groups[key]) groups[key] = { records: [], milk: 0, revenue: 0, cost: 0, profit: 0 };
        groups[key].records.push(r);
        groups[key].milk += r.total;
        groups[key].revenue += r.revenue;
    });
    
    Object.keys(groups).forEach(key => {
        const g = groups[key];
        g.cost = period === 'weekly' ? settings.cost : period === 'monthly' ? settings.cost * 4.33 : settings.cost * 13;
        g.profit = g.revenue - g.cost;
    });
    return groups;
}

function getWeekNumber(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date - start;
    return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}

function displayMultiMetrics(periods) {
    const keys = Object.keys(periods);
    const totalMilk = keys.reduce((s, k) => s + periods[k].milk, 0);
    const totalRevenue = keys.reduce((s, k) => s + periods[k].revenue, 0);
    const totalCost = keys.reduce((s, k) => s + periods[k].cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const avgMilk = totalMilk / keys.length;
    const avgProfit = totalProfit / keys.length;
    
    document.getElementById('multiMetrics').innerHTML = `
        <div class="mc">
            <div class="mv">${keys.length}</div>
            <div class="ml">Total Periods</div>
        </div>
        <div class="mc">
            <div class="mv">${totalMilk.toFixed(1)}</div>
            <div class="ml">Total Milk (L)</div>
        </div>
        <div class="mc">
            <div class="mv">${avgMilk.toFixed(1)}</div>
            <div class="ml">Avg Milk/Period</div>
        </div>
        <div class="mc">
            <div class="mv ${totalProfit >= 0 ? 'profit' : 'loss'}">₹${totalProfit.toFixed(2)}</div>
            <div class="ml">Total Profit</div>
        </div>
        <div class="mc">
            <div class="mv ${avgProfit >= 0 ? 'profit' : 'loss'}">₹${avgProfit.toFixed(2)}</div>
            <div class="ml">Avg Profit/Period</div>
        </div>
    `;
}

function displayMultiChart(periods) {
    const chart = document.getElementById('multiChart');
    chart.innerHTML = '';
    const keys = Object.keys(periods).sort();
    if (keys.length === 0) return;
    const maxMilk = Math.max(...keys.map(k => periods[k].milk));
    keys.forEach(key => {
        const p = periods[key];
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = `${(p.milk / maxMilk) * 180}px`;
        bar.style.flex = '1';
        
        const label = document.createElement('div');
        label.className = 'bl';
        label.textContent = key;
        
        const value = document.createElement('div');
        value.className = 'bv';
        value.textContent = `${p.milk.toFixed(1)}L`;
        
        bar.appendChild(label);
        bar.appendChild(value);
        chart.appendChild(bar);
    });
}

function displayMultiTable(periods) {
    const tbody = document.getElementById('multiBody');
    tbody.innerHTML = '';
    const keys = Object.keys(periods).sort();
    keys.forEach(key => {
        const p = periods[key];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${key}</td>
            <td>${p.milk.toFixed(1)}</td>
            <td>₹${p.revenue.toFixed(2)}</td>
            <td>₹${p.cost.toFixed(2)}</td>
            <td class="${p.profit >= 0 ? 'profit' : 'loss'}">₹${p.profit.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}

function downloadMulti() {
    if (records.length === 0) {
        alert('No data to download', 'error');
        return;
    }
    const period = document.getElementById('period').value;
    const periods = groupByPeriod(records, period);
    const keys = Object.keys(periods).sort();
    const totalMilk = keys.reduce((s, k) => s + periods[k].milk, 0);
    const totalRevenue = keys.reduce((s, k) => s + periods[k].revenue, 0);
    const totalCost = keys.reduce((s, k) => s + periods[k].cost, 0);
    const totalProfit = totalRevenue - totalCost;
    
    let csv = `Cattle Management Multi-Period Report (${period})\n\n`;
    csv += "SUMMARY\n";
    csv += `Total Periods,${keys.length}\n`;
    csv += `Total Milk Production,${totalMilk.toFixed(1)} Liters\n`;
    csv += `Total Revenue,₹${totalRevenue.toFixed(2)}\n`;
    csv += `Total Cost,₹${totalCost.toFixed(2)}\n`;
    csv += `Total ${totalProfit >= 0 ? 'Profit' : 'Loss'},₹${Math.abs(totalProfit).toFixed(2)}\n\n`;
    csv += "PERIOD DATA\n";
    csv += "Period,Milk (L),Revenue (₹),Cost (₹),Profit (₹)\n";
    
    keys.forEach(key => {
        const p = periods[key];
        csv += `${key},${p.milk.toFixed(1)},${p.revenue.toFixed(2)},${p.cost.toFixed(2)},${p.profit.toFixed(2)}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cattle-multi-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    alert('Multi-period report downloaded successfully!', 'success');
}
