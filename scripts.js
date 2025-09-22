// --- Load CSV và parse ---
let csvData = null;
let headers = null;
let rows = null;
let globalData = null;


function loadData() {
    return d3.csv("data_ggsheet1.csv").then(data => {
        console.log("✅ CSV load thành công, số dòng:", data.length);
        console.log(data[0]); // in thử 1 dòng đầu tiên
        data.forEach(d => {
            d['SL'] = +d['SL'];
            d['Đơn giá'] = +d['Đơn giá'];
            d['Thành tiền'] = +d['Thành tiền'];
            d['Thời gian tạo đơn'] = new Date(d['Thời gian tạo đơn']);
        });
        globalData = data;
        return data;
    }).catch(err => {
        console.error("❌ Lỗi khi load CSV:", err);
        alert("Lỗi khi tải dữ liệu. Vui lòng kiểm tra file 'data_ggsheet1.csv'");
    });
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    const headers = lines[0].split(',');
    const rows = lines.slice(1).map(line => {
        const regex = /(?:"([^"]*)")|([^,]+)/g;
        let match, arr = [], i = 0;
        while ((match = regex.exec(line)) !== null) {
            arr.push(match[1] !== undefined ? match[1] : match[2]);
            i++;
        }
        if (arr.length !== headers.length) arr = line.split(',');
        return arr;
    });
    return { headers, rows };
}


function renderTable(headers, rows, maxRows=20) {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    rows.slice(0, maxRows).forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    const container = document.getElementById('table-container');
    container.innerHTML = '';
    container.appendChild(table);
}
// --- Các hàm tiện ích (Giữ nguyên các hàm của bạn) ---
// function clearAll() {
//     d3.select("#table-container").html("");
//     d3.select("#chart").html("");
//     d3.select("#title").html("");
// }
function clearAll() {
    // Xóa nội dung
    d3.select("#table-container").html("")
        .attr("style", null)
        .attr("class", null);

    d3.select("#chart").html("")
        .attr("style", null)
        .attr("class", null);

    d3.select("#title").html("")
        .attr("style", null)
        .attr("class", null);

    // Xóa tooltip nếu có
    d3.selectAll(".tooltip").remove();

    // Xóa các element phụ như legend, subplot...
    d3.selectAll(".subplot").remove();
    d3.selectAll(".chart-title").remove();
}


function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatMoney(value) {
    if (value >= 1e9) {
        return `${(value / 1e9).toFixed(1)}B`;
    } else if (value >= 1e6) {
        return `${Math.round(value / 1e6)}M`;
    } else if (value >= 1e3) {
        return `${Math.round(value / 1e3)}K`;
    }
    return Math.round(value).toString();
}

// --- 12 CÂU HỎI PHÂN TÍCH ---

// Q1: Mặt hàng bán chạy nhất/kém nhất
function q1() {
    clearAll();
        d3.select("#title").html("");
        d3.select("#title").append("h2")
            .attr("class", "chart-title")
            .style("margin-bottom", "2px") // giảm margin dưới
            .style("text-align", "center")
            .style("width", "100%")
            .text("Doanh số bán hàng theo Mặt hàng");

    if (!globalData) {
        loadData().then(q1);
        return;
    }

    // Gộp dữ liệu theo mặt hàng, lấy mã nhóm hàng và tên nhóm hàng
    const itemData = Array.from(d3.rollup(globalData,
        v => ({
            revenue: d3.sum(v, d => d['Thành tiền']),
            name: v[0]['Tên mặt hàng'],
            groupId: v[0]['Mã nhóm hàng'],
            groupName: v[0]['Tên nhóm hàng'],
            quantity: d3.sum(v, d => d['SL'])
        }),
        d => d['Mã mặt hàng']
    )).map(d => ({
        id: d[0],
        ...d[1]
    }));

    // Sắp xếp theo doanh thu giảm dần
    itemData.sort((a, b) => b.revenue - a.revenue);

    // Tạo danh sách các nhóm hàng duy nhất, định dạng [Mã nhóm hàng] Tên nhóm hàng
    const groups = Array.from(new Set(itemData.map(d => {
        let code = d.groupId ? d.groupId.trim() : '';
        let name = d.groupName ? d.groupName.trim() : '';
        return `[${code}] ${name}`;
    })));
    // Gán màu cho từng nhóm hàng
    const color = d3.scaleOrdinal()
        .domain(groups)
        .range(d3.schemeCategory10);

    // Tạo nhãn cho từng mặt hàng: [Mã mặt hàng] Tên mặt hàng
    itemData.forEach(d => {
        d.label = `[${d.id}] ${d.name}`;
           let code = d.groupId ? d.groupId.trim() : '';
           let name = d.groupName ? d.groupName.trim() : '';
           d.groupLabel = `[${code}] ${name}`;
    });

    // Vẽ horizontal bar chart cho tất cả mặt hàng
    // Tăng chiều rộng và chuyển legend lên trên
    // Tăng chiều rộng SVG để legend luôn hiện bên phải
    const margin = { top: 50, right: 260, bottom: 40, left: 320 }; // giảm top margin
    const width = 1000; // tăng thêm cho legend
    const height = 600;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand()
        .range([0, height])
        .domain(itemData.map(d => d.label))
        .padding(0.15);

    const x = d3.scaleLinear()
        .domain([0, d3.max(itemData, d => d.revenue)])
        .range([0, width]);

    svg.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll("text")
        .style("font-size", "14px");

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d => d/1e6 + " triệu"));

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.95)")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("pointer-events", "none")
        .style("font-size", "13px");

    // Draw bars
    svg.selectAll(".bar")
        .data(itemData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d.label))
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("width", d => x(d.revenue))
        .attr("fill", d => color(d.groupLabel))
        // Tooltip: Mặt hàng, Nhóm hàng, Doanh số bán, Số lượng bán
        .on("mouseover", function(event, d) {
            tooltip.style("display", "block")
                .html(`
                    <strong>Mặt hàng:</strong> [${d.id}] ${d.name}<br>
                    <strong>Nhóm hàng:</strong> [${d.groupId}] ${d.groupName}<br>
                    <strong>Doanh số bán:</strong> ${d3.format(",")(d.revenue/1e6)} triệu VND<br>
                    <strong>Số lượng bán:</strong> ${d3.format(",")(d.quantity)} SKUs
                `)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("display", "none");
        });

    // Data labels (triệu VND)
    svg.selectAll(".label")
        .data(itemData)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x(d.revenue) + 5)
        .attr("y", d => y(d.label) + y.bandwidth() / 2 + 5)
        .text(d => (d.revenue/1e6).toFixed(0) + " triệu VND")
        .style("font-size", "13px")
        .style("fill", "#222");

    // Legend bên phải
    const legend = d3.select("#chart svg")
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + margin.left + 100}, ${margin.top})`);

    // Tạo legend cho từng nhóm hàng    
    groups.forEach((g, i) => {
        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * 28)
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", color(g));
        legend.append("text")
            .attr("x", 28)
            .attr("y", i * 28 + 15)
            .text(g)
            .style("font-size", "13px");

    });
}

// Q2: Nhóm hàng bán chạy nhất/kém nhất
function q2() {
    clearAll();
    d3.select("#title").html("");
    d3.select("#title").append("h2")
        .attr("class", "chart-title")
        .style("margin-bottom", "2px")
        .style("text-align", "center")
        .style("width", "100%")
        .text("Doanh số bán hàng theo Nhóm hàng");

    if (!globalData) {
        loadData().then(q2);
        return;
    }

    // Gom nhóm theo tên nhóm hàng
    const groupData = Array.from(d3.rollup(globalData,
        v => ({
            revenue: d3.sum(v, d => d['Thành tiền']),
            quantity: d3.sum(v, d => d['SL']),
            groupId: v[0]['Mã nhóm hàng'],
            groupName: v[0]['Tên nhóm hàng']
        }),
        d => d['Tên nhóm hàng']
    )).map(d => ({
        name: d[0],
        ...d[1]
    }));

    groupData.sort((a, b) => b.revenue - a.revenue);
    groupData.forEach(d => {
        d.groupLabel = `[${d.groupId}] ${d.groupName}`;
    });
    // Tạo scale màu cho từng nhóm hàng
    const color = d3.scaleOrdinal()
        .domain(groupData.map(d => d.groupLabel))
        .range(d3.schemeCategory10);

    const margin = { top: 50, right: 100, bottom: 40, left: 200 };
    const width = 1000;
    const height = 600;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand()
        .range([0, height])
        .domain(groupData.map(d => d.groupLabel))
        .padding(0.15);

    const x = d3.scaleLinear()
        .domain([0, d3.max(groupData, d => d.revenue)])
        .range([0, width]);

    svg.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll("text")
        .style("font-size", "14px");

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(formatMoney));
    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.95)")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("pointer-events", "none")
        .style("font-size", "13px");
    // Vẽ bar với màu riêng cho từng nhóm
    svg.selectAll(".bar")
        .data(groupData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d.groupLabel))
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("width", d => x(d.revenue))
        .attr("fill", d => color(d.groupLabel))
        .on("mouseover", function(event, d) {
            tooltip.style("display", "block")
                .html(`
                    <strong>Nhóm hàng:</strong> [${d.groupId}] ${d.groupName}<br>
                    <strong>Doanh số bán:</strong> ${d3.format(",")((d.revenue/1e6).toFixed(0))} triệu VND<br>
                    <strong>Số lượng bán:</strong> ${d3.format(",")(d.quantity)} SKUs
                `)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("display", "none");
        });

    // Data labels
    svg.selectAll(".label")
        .data(groupData)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x(d.revenue) + 5)
        .attr("y", d => y(d.groupLabel) + y.bandwidth() / 2 + 5)
        .text(d => (d.revenue/1e6).toFixed(0) + " triệu VND")
        .style("font-size", "13px")
        .style("fill", "#222");

    // Legend
    const legend = d3.select("#chart svg")
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + margin.left + 100}, ${margin.top})`);

    groupData.forEach((g, i) => {
        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * 28)
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", color(g.groupLabel));
        legend.append("text")
            .attr("x", 28)
            .attr("y", i * 28 + 15)
            .text(g.groupLabel)
            .style("font-size", "13px");
    });
}

// Q3: Tháng bán chạy nhất/kém nhất
function q3() {
    clearAll();
        d3.select("#title").html("");
        d3.select("#title").append("h2")
            .attr("class", "chart-title")
            .style("margin-bottom", "2px") // giảm margin dưới
            .style("text-align", "center")
            .style("width", "100%")
            .text("Doanh số bán hàng theo Tháng");

    if (!globalData) {
        loadData().then(q3);
        return;
    }

    const monthData = Array.from(d3.rollup(globalData,
        v => ({
            revenue: d3.sum(v, d => d['Thành tiền']),
            quantity: d3.sum(v, d => d['SL'])
        }),
        d => d['Thời gian tạo đơn'].getMonth()
    )).map(d => ({ month: d[0] + 1, ...d[1] }));

    monthData.sort((a, b) => a.month - b.month); // Sắp xếp theo tháng
    const color = d3.scaleOrdinal()
        .domain(monthData.map(d => d.month))
        .range(d3.schemeCategory10);

    const margin = { top: 50, right: 30, bottom: 40, left: 80 };
    const width = 1200;
    const height = 600;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleBand().range([0, width]).domain(monthData.map(d => `Tháng ${d.month}`)).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(monthData, d => d.revenue)]).range([height, 0]);
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.95)")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("pointer-events", "none")
        .style("font-size", "13px");

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    svg.append("g").call(d3.axisLeft(y).tickFormat(formatMoney));

    svg.selectAll(".bar")
        .data(monthData)
        .enter()
        .append("rect")
        .attr("x", d => x(`Tháng ${d.month}`))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.revenue))
        .attr("height", d => height - y(d.revenue))
        .attr("fill", d => color(d.month))
        .on("mouseover", function(event, d) {
            tooltip.style("display", "block")
                .html(`
                    <strong>Tháng:</strong> ${d.month}<br>
                    <strong>Doanh số bán:</strong> ${d3.format(",")((d.revenue/1e6).toFixed(0))} triệu VND<br>
                    <strong>Số lượng bán:</strong> ${d3.format(",")(d.quantity)} SKUs
                `)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("display", "none");
        });

    // Data labels
    svg.selectAll(".label")
        .data(monthData)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x(`Tháng ${d.month}`) )
        .attr("y", d => y(d.revenue) - 5)
        .text(d => (d.revenue/1e6).toFixed(0) + " triệu VND")
        .style("font-size", "13px")
        .style("fill", "#222");

}

// Q4: Ngày trong tuần bán chạy nhất/kém nhất
function q4() {
    clearAll();
    d3.select("#title").html("");
    d3.select("#title").append("h2")
        .attr("class", "chart-title")
        .style("margin-bottom", "2px")
        .style("text-align", "center")
        .style("width", "100%")
        .text("Doanh số bán hàng trung bình theo Ngày trong Tuần");

    if (!globalData) {
        loadData().then(q4);
        return;
    }

    // Gom nhóm theo ngày trong tuần
    const weekdayData = Array.from(d3.rollup(globalData,
        v => ({
            revenue: d3.sum(v, d => d['Thành tiền']),
            quantity: d3.sum(v, d => d['SL']) / 52
        }),
        d => d['Thời gian tạo đơn'].getDay()
    )).map(d => ({ day: d[0], ...d[1] }));

    // Map thứ (T2 -> CN), đồng thời chuyển 0 (CN) về cuối
    const dayNames = ['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ Nhật'];
    weekdayData.forEach(d => {
        d.dayName = dayNames[d.day === 0 ? 6 : d.day - 1];
        // Tính trung bình theo tuần (52 tuần)
        d.avgRevenue = d.revenue / 52;
    });

    // Sort lại theo thứ tự T2 -> CN
    weekdayData.sort((a, b) => {
        const order = ['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ Nhật'];
        return order.indexOf(a.dayName) - order.indexOf(b.dayName);
    });

    // Color scale
    const color = d3.scaleOrdinal()
        .domain(weekdayData.map(d => d.dayName))
        .range(d3.schemeCategory10);

    const margin = { top: 50, right: 30, bottom: 40, left: 80 };
    const width = 1200;
    const height = 600;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Scales
    const x = d3.scaleBand()
        .range([0, width])
        .domain(weekdayData.map(d => d.dayName))
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(weekdayData, d => d.avgRevenue)])
        .nice()
        .range([height, 0]);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(formatMoney));

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.95)")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("pointer-events", "none")
        .style("font-size", "13px");
    // Bars
    svg.selectAll(".bar")
        .data(weekdayData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.dayName))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.avgRevenue))
        .attr("height", d => height - y(d.avgRevenue))
        .attr("fill", d => color(d.dayName))
        .on("mouseover", function(event, d) {
            tooltip.style("display", "block")
                .html(`
                    <strong>Ngày ${d.dayName}</strong> <br>
                    <strong>Doanh số bán TB:</strong> ${Math.round(d.avgRevenue).toLocaleString("en-US")} VND<br>
                    <strong>Số lượng bán TB:</strong> ${d3.format(",")((d.quantity).toFixed(0))} SKUs
                `)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("display", "none");
        });

    // Labels
    svg.selectAll(".label")
        .data(weekdayData)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x(d.dayName) + x.bandwidth() / 2)
        .attr("y", d => y(d.avgRevenue) - 5)
        .attr("text-anchor", "middle")
        .text(d => Math.round(d.avgRevenue).toLocaleString("en-US") + " VND")
        .style("font-size", "13px")
        .style("fill", "#222");

}

// Q5: Ngày trong tháng bán chạy nhất/kém nhất
function q5() {
    clearAll();
    d3.select("#title").html("");
    d3.select("#title").append("h2")
        .attr("class", "chart-title")
        .style("margin-bottom", "2px")
        .style("text-align", "center")
        .style("width", "100%")
        .text("Doanh số bán hàng trung bình theo Ngày trong Tháng");

    if (!globalData) {
        loadData().then(q5);
        return;
    }
    // Gom nhóm theo ngày trong tháng
    const dayInMonthData = Array.from(d3.rollup(globalData,
    v => ({
        dayRevenue: d3.sum(v, d => d['Thành tiền']) / 12,
        quantity: d3.sum(v, d => d['SL']) / 12
    }),
        d => d['Thời gian tạo đơn'].getDate()))
        .map(d => ({ day: d[0], ...d[1] }));

    // Sắp xếp theo ngày
    dayInMonthData.sort((a, b) => a.day - b.day);

    // Thiết lập margin & size
    const margin = { top: 50, right: 40, bottom: 50, left: 70 };
    const width = 1200;
    const height = 600;
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.95)")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("pointer-events", "none")
        .style("font-size", "13px");
    // SVG
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scale
    const x = d3.scaleBand()
        .domain(d3.range(1, 32).map(d => `Ngày ${d}`)) // Giữ nguyên
        .range([0, width])
        .padding(0.2);


    const y = d3.scaleLinear()
        .domain([0, d3.max(dayInMonthData, d => d.dayRevenue)])
        .nice()
        .range([height, 0]);

    // Axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")              // chọn tất cả text của trục X
        .style("text-anchor", "end")    // neo chữ về cuối để dễ đọc
        .attr("dx", "-0.8em")           // dịch ngang
        .attr("dy", "0.15em")           // dịch dọc
        .attr("transform", "rotate(-45)"); // xoay chữ -45 độ
        

    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(formatMoney));

    // Color scale
    const color = d3.scaleOrdinal()
        .domain(dayInMonthData.map(d => d.day))
        .range(d3.schemeCategory10);
    // Bars
    svg.selectAll("rect")
        .data(dayInMonthData)
        .enter().append("rect")
        .attr("x", d => x(`Ngày ${d.day}`))
        .attr("y", d => y(d.dayRevenue))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.dayRevenue))
        .attr("fill", d => color(d.day))
        .on("mouseover", function(event, d) {
            tooltip.style("display", "block")
                .html(`
                    <strong>Ngày ${d.day}</strong> <br>
                    <strong>Doanh số bán TB:</strong> ${(d.dayRevenue/1e6).toFixed(1)} triệu VND<br>
                    <strong>Số lượng bán TB:</strong> ${Math.round(d.quantity).toLocaleString("en-US")} SKUs
                `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            tooltip.style("display", "none");
            d3.select(this).attr("fill", color(d.day));
        });

    // Data labels
    svg.selectAll(".label")
        .data(dayInMonthData)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x(`Ngày ${d.day}`) + x.bandwidth() / 2)
        .attr("y", d => y(d.dayRevenue) - 5)
        .attr("text-anchor", "middle")
        .text(d => (d.dayRevenue / 1e6).toFixed(1) + " tr")
        .style("font-size", "13px")
        .style("fill", "#222");

    // 1. Tạo tooltip (ẩn ban đầu)
    // const tooltip = d3.select("#chart")
    //     .append("div")
    //     .attr("class", "tooltip")
    //     .style("position", "absolute")
    //     .style("background", "rgba(0,0,0,0.7)")
    //     .style("color", "#fff")
    //     .style("padding", "6px 10px")
    //     .style("border-radius", "4px")
    //     .style("font-size", "13px")
    //     .style("pointer-events", "none")
    //     .style("opacity", 0);

    // // 2. Thêm sự kiện cho rect
    // svg.selectAll("rect")
    //     .on("mouseover", function (event, d) {
    //         tooltip.style("opacity", 1)
    //             .html(`
    //                 <strong>${"Ngày " + d.day}</strong><br>
    //                 Doanh thu: ${(d.dayRevenue/1e6).toFixed(2)} triệu<br>
    //                 Số SKU: ${d.skuCount}
    //             `);
    //         d3.select(this).attr("fill", "orange"); // highlight cột
    //     })
    //     .on("mousemove", function (event) {
    //         tooltip
    //             .style("left", (event.pageX + 10) + "px")
    //             .style("top", (event.pageY - 28) + "px");
    //     })
    //     .on("mouseout", function (event, d) {
    //         tooltip.style("opacity", 0);
    //         d3.select(this).attr("fill", color(d.day)); // trả về màu cũ
    //     });


};

// Q6: Khung giờ bán chạy nhất/kém nhất
function q6() {
    clearAll();
    d3.select("#title").html("");
    d3.select("#title").append("h2")
        .attr("class", "chart-title")
        .style("margin-bottom", "2px")
        .style("text-align", "center")
        .style("width", "100%")
        .text("Doanh thu trung bình theo Khung giờ");

    if (!globalData) {
        loadData().then(q6);
        return;
    }
    // Gom nhóm theo giờ
    const hourData = Array.from(d3.rollup(globalData,
        v => ({
            avgRevenue: d3.sum(v, d => d['Thành tiền']) / 365,
            quantity: d3.sum(v, d => d['SL'])
        }),
        d => d['Thời gian tạo đơn'].getHours()
    )).map(d => ({ hour: d[0], ...d[1] }));

    // Sắp xếp theo giờ
    hourData.sort((a, b) => a.hour - b.hour);

    // Thiết lập margin & size
    const margin = { top: 50, right: 40, bottom: 60, left: 80 };
    const width = 1200;
    const height = 600;
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.95)")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("pointer-events", "none")
        .style("font-size", "13px");
    // SVG
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scale
    const x = d3.scaleBand()
        .domain(d3.range(8, 24).map(h => `${h}:00 - ${h}:59`)) // 8h → 23h
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(hourData, d => d.avgRevenue)])
        .nice()
        .range([height, 0]);

    // Axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em")
        .attr("transform", "rotate(-45)");

    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(formatMoney));

    const color = d3.scaleOrdinal()
        .domain(hourData.map(d => d.hour))
        .range(d3.schemeTableau10);
    // Bars
    svg.selectAll("rect")
        .data(hourData)
        .enter().append("rect")
        .attr("x", d => x(`${d.hour}:00 - ${d.hour}:59`))
        .attr("y", d => y(d.avgRevenue))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.avgRevenue))
        .attr("fill", d => color(d.hour))
        .on("mouseover", function(event, d) {
            tooltip.style("display", "block")
                .html(`
                    <strong>Khung giờ:</strong> ${d.hour}:00 - ${d.hour}:59 <br>
                    <strong>Doanh số bán TB:</strong> ${Number(d.avgRevenue.toFixed(0)).toLocaleString("en-US")} VND<br>
                    <strong>Số lượng bán TB:</strong> ${Math.round(d.quantity).toLocaleString("en-US")} SKUs
                `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            tooltip.style("display", "none");
            d3.select(this).attr("fill", color(d.hour));
        });

    // Data labels
    svg.selectAll(".label")
        .data(hourData)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x(`${d.hour}:00 - ${d.hour}:59`) + x.bandwidth() / 2)
        .attr("y", d => y(d.avgRevenue) - 5)
        .attr("text-anchor", "middle")
        .text(d => Number(d.avgRevenue.toFixed(0)).toLocaleString("en-US") + " VND")
        .style("font-size", "12px")
        .style("fill", "#222");
}

// Q7: Xác suất bán hàng theo nhóm hàng
function q7() {
    clearAll();
        d3.select("#title").html("");
        d3.select("#title").append("h2")
            .attr("class", "chart-title")
            .style("margin-bottom", "2px") 
            .style("text-align", "center")
            .style("width", "100%")
            .text("Xác suất bán hàng theo Nhóm hàng");

    if (!globalData) {
        loadData().then(q7);
        return;
    }

    // Tính tổng số đơn hàng duy nhất
    const totalOrders = new Set(globalData.map(d => d['Mã đơn hàng'])).size;

    // Tính số đơn hàng duy nhất theo nhóm
    const groupProbData = Array.from(
        d3.rollup(globalData,
            v => {
                const uniqueOrders = new Set(v.map(d => d['Mã đơn hàng'])).size;
                return {
                    prob: uniqueOrders / totalOrders,
                    groupId: v[0]['Mã nhóm hàng'],
                    groupName: v[0]['Tên nhóm hàng']
                };
            },
            d => d['Tên nhóm hàng']
        )
    ).map(d => ({
        name: d[0],
        prob: d[1].prob,
        groupId: d[1].groupId,
        groupName: d[1].groupName,
        groupProbLabel: `[${d[1].groupId}] ${d[1].groupName}`
    }));


    groupProbData.sort((a,b) => b.prob - a.prob);

    const margin = { top: 20, right: 80, bottom: 40, left: 100 };
    const width = 1000;
    const height = 600;
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.95)")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("pointer-events", "none")
        .style("font-size", "13px");
    const svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand().range([0, height]).domain(groupProbData.map(d => d.groupProbLabel)).padding(0.1);
    const x = d3.scaleLinear().domain([0, d3.max(groupProbData, d => d.prob)]).range([0, width]);

    svg.append("g").call(d3.axisLeft(y));
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format(".0%")));
    const color = d3.scaleOrdinal()
        .domain(groupProbData.map(d => d.groupProbLabel))
        .range(d3.schemeCategory10);
    svg.selectAll("rect")
        .data(groupProbData)
        .enter().append("rect")
        .attr("y", d => y(d.groupProbLabel))
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("width", d => x(d.prob))
        .attr("fill", d => color(d.groupProbLabel))
        .on("mouseover", function(event, d) {
            tooltip.style("display", "block")
                .html(`
                    <strong>Nhóm hàng:</strong> [${d.groupId}] ${d.groupName} <br>
                    <strong>SL đơn bán:</strong> ${d3.format(",")(Math.round(d.prob * totalOrders))}<br>
                    <strong>Xác suất bán:</strong> ${(d.prob * 100).toFixed(1)} %
                `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            tooltip.style("display", "none");
            d3.select(this).attr("fill", color(d.groupProbLabel));
        });

    // Data labels
    svg.selectAll(".label")
        .data(groupProbData)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x(d.prob) + 5)
        .attr("y", d => y(d.groupProbLabel) + y.bandwidth() / 2 + 5)
        .text(d => (d.prob * 100).toFixed(1) + " %")
        .style("font-size", "13px")
        .style("fill", "#222");
        
};

// Q8: Xác suất mua hàng theo tháng của từng nhóm hàng
function q8() {
    clearAll();
    d3.select("#title").html("");
    d3.select("#title").append("h2")
        .attr("class", "chart-title")
        .style("margin-bottom", "2px")
        .style("text-align", "center")
        .style("width", "100%")
        .text("Xác suất bán hàng theo Nhóm hàng theo Tháng");

    if (!globalData) {
        loadData().then(q8);
        return;
    }

    // 1. Tính tổng số đơn hàng duy nhất trong mỗi tháng (làm mẫu số)
    const monthlyTotals = d3.rollup(
        globalData,
        v => new Set(v.map(d => d['Mã đơn hàng'])).size,
        d => d['Thời gian tạo đơn'].getMonth()
    );

    // 2. Tính toán và cấu trúc lại dữ liệu
    const monthlyGroupProba = Array.from(
        d3.rollup(globalData,
            v => {
                const month = v[0]['Thời gian tạo đơn'].getMonth();
                const totalOrdersInMonth = monthlyTotals.get(month);
                
                // Rollup lần 2: nhóm theo Tên nhóm hàng, tính xác suất và lấy groupId
                return Array.from(
                    d3.rollup(
                        v,
                        g => {
                            const uniqueOrders = new Set(g.map(d => d['Mã đơn hàng'])).size;
                            // Trả về một object chứa cả xác suất và mã nhóm
                            return {
                                proba: uniqueOrders / totalOrdersInMonth,
                                groupId: g[0]['Mã nhóm hàng'],
                                count: uniqueOrders
                            };
                        },
                        d => d['Tên nhóm hàng']
                    )
                );
            },
            d => d['Thời gian tạo đơn'].getMonth()
        )
    ).flatMap(([month, groupData]) =>
        // 3. "Làm phẳng" dữ liệu thành cấu trúc mong muốn
        groupData.map(([groupName, data]) => ({
            month: month + 1,
            groupName: groupName,
            proba: data.proba,
            count: data.count,
            groupId: data.groupId,
            groupLabel: `[${data.groupId}] ${groupName}` // Tạo nhãn trực tiếp ở đây
        }))
    );

    monthlyGroupProba.sort((a, b) => a.month - b.month);

    // 4. Gom nhóm dữ liệu theo `groupLabel` để vẽ đường và legend
    const nestedData = d3.group(monthlyGroupProba, d => d.groupLabel);

    // --- Bắt đầu vẽ biểu đồ ---
    const margin = { top: 50, right: 250, bottom: 40, left: 60 };
    const width = 1200;
    const height = 600;
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.95)")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("pointer-events", "none")
        .style("font-size", "13px");
        
    const svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 5. Định nghĩa các trục và thang đo (scale)
    const x = d3.scaleLinear().domain([1, 12]).range([0, width]);
    const y = d3.scaleLinear().domain([0.2, d3.max(monthlyGroupProba, d => d.proba) + 0.05]).range([height, 0]);
    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(Array.from(nestedData.keys()));

    // Vẽ trục X và Y
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(12).tickFormat(d => `T${d}`));
    svg.append("g")
        .call(d3.axisLeft(y)
        .tickFormat(d3.format(".0%")));

    // Định nghĩa hàm vẽ đường
    const line = d3.line()
        .x(d => x(d.month))
        .y(d => y(d.proba));

    // Vẽ các đường line
    svg.selectAll(".line")
        .data(nestedData)
        .enter()
        .append("path")
        .attr("fill", "none")
        .attr("stroke", d => color(d[0])) // d[0] là key (groupLabel)
        .attr("stroke-width", 2)
        .attr("d", d => line(d[1])); // d[1] là mảng value

    // Vẽ các điểm (circle) cho mỗi giá trị
    svg.selectAll(".dot")
    .data(monthlyGroupProba)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.month))
    .attr("cy", d => y(d.proba))
    .attr("r", 4)
    .attr("fill", d => color(d.groupLabel))
    .on("mouseover", (event, d) => {
        tooltip.style("display", "block")
            .html(`
                <strong>Tháng ${String(d.month).padStart(2, "0")}</strong> | <strong>Nhóm hàng ${d.groupLabel}</strong><br>
                SL Đơn Bán: ${d.count?.toLocaleString()}<br>
                Xác suất Bán: ${d3.format(".1%")(d.proba)}
            `);
    })
    .on("mousemove", (event) => {
        tooltip.style("left", (event.pageX + 15) + "px")
               .style("top", (event.pageY - 30) + "px");
    })
    .on("mouseout", () => {
        tooltip.style("display", "none");
    });


    // 6. Vẽ Legend (Chú thích) - ĐÃ SỬA
    const legend = svg.selectAll(".legend")
        .data(nestedData.keys()) // Lấy danh sách các nhãn duy nhất
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(${width + 20}, ${i * 25})`);

    legend.append("rect")
        .attr("x", 0)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", d => color(d)); // d chính là groupLabel

    legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "start")
        .text(d => d); // d chính là groupLabel
}

// Q9: Xác suất bán mặt hàng trong từng nhóm hàng
function q9() {
    clearAll();
    d3.select("#title").html("");
    d3.select("#title").append("h2")
        .attr("class", "chart-title")
        .style("margin-bottom", "2px")
        .style("text-align", "center")
        .style("width", "100%")
        .text("Doanh số bán hàng theo Mặt hàng");

    if (!globalData) {
        loadData().then(q9);
        return;
    }
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.95)")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("pointer-events", "none")
        .style("font-size", "13px");
    const groupedByGroup = d3.group(globalData, d => `[${d['Mã nhóm hàng']}] ${d['Tên nhóm hàng']}`);
    const sortedGroups = Array.from(groupedByGroup.entries())
        .sort((a,b) => d3.ascending(a[0], b[0]));

    const chartContainer = d3.select("#chart")
        .style("display", "grid")
        .style("grid-template-columns", "repeat(3, 1fr)")
        .style("gap", "30px");

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    sortedGroups.forEach(([groupName, items]) => {
        const totalInGroup = new Set(items.map(d => d['Mã đơn hàng'])).size;

        const itemProba = Array.from(
            d3.rollup(
                items,
                v => new Set(v.map(d => d['Mã đơn hàng'])).size / totalInGroup,
                d => `[${d['Mã mặt hàng']}] ${d['Tên mặt hàng']}`
            ),
            ([name, proba]) => ({ name, proba })
        );

        itemProba.sort((a,b) => b.proba - a.proba);

        const container = chartContainer.append("div").attr("class", "subplot");
        container.append("h3").text(groupName);

        const margin = { top: 20, right: 50, bottom: 40, left: 200 };
        const width = 300;
        const height = 220;

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const y = d3.scaleBand().range([0, height]).domain(itemProba.map(d => d.name)).padding(0.1);
        const x = d3.scaleLinear().domain([0, d3.max(itemProba, d => d.proba) + 0.03]).range([0, width]);

        svg.append("g").call(d3.axisLeft(y));
        svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format(".0%")));

        // Vẽ bars
        svg.selectAll("rect")
            .data(itemProba)
            .enter().append("rect")
            .attr("y", d => y(d.name))
            .attr("height", y.bandwidth())
            .attr("x", 0)
            .attr("width", d => x(d.proba))
            .attr("fill", d => color(d.name))
            .on("mouseover", function(event, d) {
                tooltip.style("display", "block")
                    .html(`
                        Mặt hàng: <strong>${d.name}</strong><br>
                        Nhóm hàng: <strong>${groupName}</strong><br>
                        Xác suất bán: <strong>${d3.format(".1%")(d.proba)}</strong>
                    `);
            })
            .on("mousemove", function(event) {
                tooltip.style("left", (event.pageX + 15) + "px")
                       .style("top", (event.pageY - 30) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("display", "none");
            });

        // Vẽ data labels ngay sau khi tạo rect
        svg.selectAll(".label")
            .data(itemProba)
            .enter()
            .append("text")
            .attr("class", "label")
            .attr("x", d => x(d.proba) + 5)
            .attr("y", d => y(d.name) + y.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "start")
            .style("font-size", "12px")
            .style("fill", "#222")
            .text(d => d3.format(".1%")(d.proba));
    });
}


// Q10: Biến thiên xác suất mua hàng theo tháng của mặt hàng trong nhóm
function q10() {
    clearAll();
    d3.select("#chart").html("");
    d3.select("#title").html("");

    // --- Tiêu đề ---
    d3.select("#title").append("h2")
        .attr("class", "chart-title")
        .style("text-align", "center")
        .style("margin-bottom", "25px")
        .text("Xác suất bán hàng của Mặt hàng theo Nhóm hàng theo từng Tháng");

    // --- Kiểm tra dữ liệu ---
    if (!globalData) {
        loadData().then(q10);
        return;
    }
    const data = globalData;

    // --- Parse ngày & tạo cột Tháng ---
    data.forEach(d => {
        const date = d["Thời gian tạo đơn"];
        if (date) {
            d.Thang = date.getMonth() + 1; // Lấy tháng (1-12)
        } else {
            d.Thang = "Unknown";
        }
    });

    // --- Gom nhóm theo Nhóm hàng ---
    const groupedData = d3.group(
        data,
        d => `[${d["Mã nhóm hàng"]}] ${d["Tên nhóm hàng"]}`
    );
    const sortedGroups = Array.from(groupedData.entries())
        .sort((a, b) => d3.ascending(a[0], b[0]));

    // --- Container chính ---
    const chartContainer = d3.select("#chart")
        .style("display", "grid")
        .style("grid-template-columns", "repeat(3, 1fr)")
        .style("gap", "30px");

    // --- Tooltip ---
    d3.selectAll(".tooltip").remove();
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.9)")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("pointer-events", "none")
        .style("font-size", "12px");

    // --- Vẽ từng subplot ---
    sortedGroups.forEach(([groupName, items]) => {
        // 1. Tổng số đơn theo tháng trong nhóm
        const monthlyOrders = d3.rollup(
            items,
            v => new Set(v.map(d => d["Mã đơn hàng"])).size,
            d => d.Thang
        );

        // 2. Số đơn theo tháng & mặt hàng
        const itemMonthlyOrders = d3.rollup(
            items,
            v => new Set(v.map(d => d["Mã đơn hàng"])).size,
            d => d.Thang,
            d => `[${d["Mã mặt hàng"]}] ${d["Tên mặt hàng"]}`
        );

        // 3. Tính xác suất
        let transformedData = [];
        itemMonthlyOrders.forEach((itemMap, month) => {
            const total = monthlyOrders.get(month) || 1;
            itemMap.forEach((count, item) => {
                transformedData.push({
                    month: month,
                    item: item,
                    probability: count / total
                });
            });
        });

        // --- Container subplot ---
        const container = chartContainer.append("div").attr("class", "subplot");
        container.append("h3").text(groupName);

        // --- Kích thước ---
        const margin = { top: 15, right: 50, bottom: 25, left: 50 };
        const width = 470;
        const height = 200;
        const outerW = width + margin.left + margin.right;
        const outerH = height + margin.top + margin.bottom;

        const svg = container.append("svg")
            .attr("width", outerW)
            .attr("height", outerH)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // --- Scale ---
        const allMonths = [...new Set(transformedData.map(d => d.month))].sort((a, b) => a - b);
        const allItems = [...new Set(transformedData.map(d => d.item))];

        const minVal = d3.min(transformedData, d => d.probability);
        const maxVal = d3.max(transformedData, d => d.probability);

        // Nếu chỉ có 1 giá trị -> tạo khoảng  ±20%
        let yMin, yMax;
        if (minVal === maxVal) {
            yMin = Math.max(0, minVal - 0.2);
            yMax = Math.min(1.2, maxVal + 0.2);
        } else {
            const padding = 0.05 * (maxVal - minVal);
            yMin = Math.max(0, minVal - padding);
            yMax = Math.min(1.2, maxVal + padding);
        }

        const xScale = d3.scalePoint()
            .domain(allMonths)
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([yMin, yMax])
            .range([height, 0]);

        const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(allItems);

        // --- Trục ---
        svg.append("g")
            .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".0%")));
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d => `T${d}`));

        // --- Line chart ---
        const itemsGrouped = d3.group(transformedData, d => d.item);
        const line = d3.line()
            .x(d => xScale(d.month))
            .y(d => yScale(d.probability));
            
        svg.selectAll(".line")
            .data(itemsGrouped)
            .enter()
            .append("path")
            .attr("fill", "none")
            .attr("stroke", d => colorScale(d[0]))
            .attr("stroke-width", 2)
            .attr("d", d => line(d[1]));

        // --- Điểm + Tooltip ---
        svg.selectAll(".dot")
            .data(transformedData)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.month))
            .attr("cy", d => yScale(d.probability))
            .attr("r", 4)
            .attr("fill", d => colorScale(d.item))
            .style("cursor", "pointer")
            .on("mouseover", (event, d) => {
                tooltip.style("display", "block")
                    .html(`<strong>Mặt hàng:</strong> ${d.item}<br>
                           <strong>Tháng:</strong> Tháng ${d.month}<br>
                           <strong>Xác suất:</strong> ${d3.format(".1%")(d.probability)}`);
            })
            .on("mousemove", (event) => {
                tooltip.style("left", (event.pageX + 15) + "px")
                       .style("top", (event.pageY - 30) + "px");
            })
            .on("mouseout", () => {
                tooltip.style("display", "none");
            });

        // --- Legend cuộn ngang, center theo SVG khi không tràn ---
        const legendContainer = container.append("div")
            .style("margin", "8px auto 0")
            .style("width", outerW + "px")
            .style("display", "flex")
            .style("align-items", "center")
            .style("gap", "8px");

        const arrowBtnStyle = (sel) => sel
            .attr("type", "button")
            .style("width", "28px")
            .style("height", "28px")
            .style("display", "inline-flex")
            .style("align-items", "center")
            .style("justify-content", "center")
            .style("border", "1px solid #ccc")
            .style("border-radius", "50%")
            .style("background", "#fff")
            .style("cursor", "pointer")
            .style("user-select", "none")
            .style("padding", "0");

        const btnPrev = arrowBtnStyle(legendContainer.append("button")).text("‹");

        const viewport = legendContainer.append("div")
            .style("flex", "1 1 auto")
            .style("overflow", "hidden")
            .style("width", "100%");

        const track = viewport.append("div")
            .style("display", "flex")
            .style("gap", "12px")
            .style("white-space", "nowrap")
            .style("transition", "transform 0.2s ease")
            .style("justify-content", "flex-start");

        const btnNext = arrowBtnStyle(legendContainer.append("button")).text("›");

        const legendItems = track.selectAll(".legend-item")
            .data(allItems)
            .enter()
            .append("div")
            .attr("class", "legend-item")
            .style("display", "inline-flex")
            .style("align-items", "center")
            .style("gap", "6px")
            .style("padding", "4px 8px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "14px")
            .style("font-size", "12px")
            .style("background", "#fafafa")
            .style("white-space", "nowrap")
            .style("cursor", "default");

        legendItems.append("span")
            .style("display", "inline-block")
            .style("width", "10px")
            .style("height", "10px")
            .style("border-radius", "2px")
            .style("background", d => colorScale(d));

        legendItems.append("span").text(d => d);

        // Cuộn ngang bằng nút mũi tên + căn giữa khi không tràn (center theo SVG)
        const vp = viewport.node();
        function updateArrowState() {
            const canScroll = vp.scrollWidth > vp.clientWidth + 1;
            btnPrev.style("display", canScroll ? "inline-flex" : "none");
            btnNext.style("display", canScroll ? "inline-flex" : "none");
            btnPrev.attr("disabled", vp.scrollLeft <= 0 ? true : null);
            btnNext.attr("disabled", (vp.scrollLeft + vp.clientWidth >= vp.scrollWidth - 1) ? true : null);

            if (!canScroll) {
                // Không tràn: center legend theo bề rộng SVG
                track.style("justify-content", "center");
            } else {
                // Có tràn: canh trái để cuộn
                track.style("justify-content", "flex-start");
            }
        }
        function scrollByStep(dir) {
            const step = Math.max(120, Math.floor(vp.clientWidth * 0.8));
            vp.scrollBy({ left: dir * step, behavior: "smooth" });
        }
        btnPrev.on("click", () => scrollByStep(-1));
        btnNext.on("click", () => scrollByStep(1));
        viewport.on("scroll", updateArrowState);

        // Khởi tạo trạng thái mũi tên/center sau khi render
        setTimeout(updateArrowState, 0);
    });
}
// Q11: Phân phối mức độ mua lặp lại của khách hàng
function q11() {
    clearAll();
    d3.select("#title").html("");
    d3.select("#title").append("h2")
        .attr("class", "chart-title")
        .style("margin-bottom", "2px")
        .style("text-align", "center")
        .style("width", "100%")
        .text("Phân phối Lượt mua hàng");
    d3.select("#table-container").html("");
    
    // Reset chart container hoàn toàn
    d3.select("#chart")
        .html("")
        .attr("style", null)  // Xóa tất cả inline style
        .style("display", "flex")  // Thiết lập style mặc định
        .style("flex-direction", "column")
        .style("align-items", "center")
        .style("justify-content", "center");

    if (!globalData) {
        loadData().then(q11);
        return;
    }

    // Tính số lần mua (số đơn hàng duy nhất) theo khách hàng
    const customerPurchases = Array.from(
        d3.rollup(
            globalData,
            v => new Set(v.map(d => d['Mã đơn hàng'])).size,
            d => d['Mã khách hàng']
        ),
        d => d[1]
    );

    // Gom nhóm theo số lần mua
    const purchaseDist = Array.from(
        d3.rollup(
            customerPurchases,
            v => v.length,
            d => d
        ),
        ([num, count]) => ({ num, count })
    ).sort((a, b) => a.num - b.num);

    const totalCustomers = customerPurchases.length;



    const margin = { top: 30, right: 30, bottom: 50, left: 60 };
    const width = 1200 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // Tooltip
    d3.selectAll(".tooltip").remove();
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.95)")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("pointer-events", "none")
        .style("font-size", "13px");

    const svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(purchaseDist.map(d => d.num))
        .range([0, width])
        .padding(0.15);

    const y = d3.scaleLinear()
        .domain([0, d3.max(purchaseDist, d => d.count)])
        .nice()
        .range([height, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d => d));

    svg.append("g")
        .call(d3.axisLeft(y).ticks(8).tickFormat(formatNumber));

    // Bars
    svg.selectAll(".bar")
        .data(purchaseDist)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.num))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.count))
        .attr("height", d => height - y(d.count))
        .attr("fill", "#3498db")
        .on("mouseover", function(event, d) {
            tooltip.style("display", "block")
                .html(`Đã mua <strong>${d.num}</strong> lần <br>
                       <strong>Số khách hàng:</strong> ${formatNumber(d.count)}<br>`);
            d3.select(this).attr("fill", "#0a69a9ff");
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 15) + "px")
                   .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("display", "none");
            d3.select(this).attr("fill", "#3498db");
        });
}                

// Q12: Phân phối số tiền khách hàng chi trả            
function q12() {
    clearAll();
    
    d3.select("#title").html("");
    d3.select("#title").append("h2")
        .attr("class", "chart-title")
        .style("margin-bottom", "2px")
        .style("text-align", "center")
        .style("width", "100%")
        .text("Phân phối Mức chi trả của Khách hàng");
    d3.select("#table-container").html("");
    
    // Reset chart container hoàn toàn
    d3.select("#chart")
        .html("")
        .attr("style", null)  // Xóa tất cả inline style
        .style("display", "flex")  // Thiết lập style mặc định
        .style("flex-direction", "column")
        .style("align-items", "center")
        .style("justify-content", "center");

    if (!globalData) {
        loadData().then(q12);
        return;
    }

    // B1: Tổng chi của từng khách hàng
    const spendingByCustomer = Array.from(
        d3.rollup(
            globalData,
            v => d3.sum(v, d => d['Thành tiền']),
            d => d['Mã khách hàng']
        ),
        ([, total]) => total
    );

    // B2: Gom nhóm theo bin 50.000
    const binSize = 50000;
    const spendingDistribution = d3.rollups(
        spendingByCustomer,
        v => v.length,
        d => Math.floor(d / binSize) * binSize
    ).map(([binStart, count]) => ({
        binStart,
        binEnd: binStart + binSize,
        label: `Từ ${formatNumber(binStart)} đến ${formatNumber(binStart + binSize)}`,
        count
    })).sort((a, b) => a.binStart - b.binStart);

    // Chart dimensions
    const margin = { top: 40, right: 40, bottom: 120, left: 90 };
    const width = 1200;
    const height = 500;

    // Tooltip
    d3.selectAll(".tooltip").remove();
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.95)")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("pointer-events", "none")
        .style("font-size", "13px");

    const svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale
    const x = d3.scaleBand()
        .domain(spendingDistribution.map(d => d.label))
        .range([0, width])
        .padding(0.15);

    // Y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(spendingDistribution, d => d.count)])
        .nice()
        .range([height, 0]);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em")
        .attr("transform", "rotate(-45)");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(8).tickFormat(formatNumber));

    // Bars
    svg.selectAll(".bar")
        .data(spendingDistribution)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.label))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.count))
        .attr("height", d => height - y(d.count))
        .attr("fill", "#72b7b2")
        .on("mouseover", function(event, d) {
            tooltip.style("display", "block")
                .html(`Đã chi tiêu <strong>${d.label}</strong><br>
                       <strong>Số khách hàng:</strong> ${formatNumber(d.count)}`);
            d3.select(this).attr("fill", "#1abc9c");
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 15) + "px")
                   .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("display", "none");
            d3.select(this).attr("fill", "#72b7b2");
        });

    // Data labels
    // svg.selectAll(".label")
    //     .data(spendingDistribution)
    //     .enter()
    //     .append("text")
    //     .attr("class", "label")
    //     .attr("x", d => x(d.label) + x.bandwidth() / 2)
    //     .attr("y", d => y(d.count) - 5)
    //     .attr("text-anchor", "middle")
    //     .style("font-size", "12px")
    //     .style("fill", "#222")
    //     .text(d => formatNumber(d.count));

    // Axis labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 70)
        .style("text-anchor", "middle")
        .style("font-size", "14px");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Số lượng khách hàng");
}


document.addEventListener('DOMContentLoaded', function() {
    loadData().then(() => {
        if (globalData && globalData.length) {
            d3.select("#title").html(`✅ Đã tải dữ liệu thành công. Tổng số dòng: ${globalData.length.toLocaleString()}`);
        } else {
            d3.select("#title").html("❌ Không có dữ liệu hợp lệ. Vui lòng kiểm tra file 'data_ggsheet1.csv'");
        }
    }).catch(error => {
        console.error('Error loading data:', error);
        d3.select("#title").html("❌ Lỗi khi tải dữ liệu. Vui lòng kiểm tra file 'data_ggsheet1.csv'");
    });
});