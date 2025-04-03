document.addEventListener('DOMContentLoaded', function() {
    const cardTypeSelect = document.getElementById('card-type');
    const cardCountInput = document.getElementById('card-count');
    const generateBtn = document.getElementById('generate-btn');
    const salesBtn = document.getElementById('sales-btn');
    const cardsContainer = document.getElementById('cards-container');
    const salesModal = document.getElementById('sales-modal');
    const salesList = document.getElementById('sales-list');
    const closeModal = document.querySelector('.close-modal');
    const previewContainer = document.getElementById('card-preview-container');
    const previewCard = document.getElementById('preview-card');
    const closePreview = document.getElementById('close-preview');
    const savePreviewBtn = document.getElementById('save-preview-btn');

    let soldCards = JSON.parse(localStorage.getItem('soldCards')) || [];

    generateBtn.addEventListener('click', function() {
        const cardType = cardTypeSelect.value;
        const cardCount = parseInt(cardCountInput.value);

        if (cardCount < 1) {
            alert('الرجاء إدخال عدد صحيح موجب');
            return;
        }

        fetch(`${cardType}.js`)
            .then(response => {
                if (!response.ok) throw new Error('لم يتم العثور على الملف');
                return response.text();
            })
            .then(data => {
                // إزالة أي تعليقات أو أسطر غير ضرورية
                const csvData = data.split('\n')
                    .filter(line => !line.trim().startsWith('//') && line.trim() !== '')
                    .join('\n');

                const cards = parseCSV(csvData);
                const availableCards = cards.filter(card =>
                    !soldCards.some(s => s.username === card.Login && s.password === card.Password)
                );

                if (availableCards.length < cardCount) {
                    alert(`لا يوجد سوى ${availableCards.length} كرت متاح من هذا النوع`);
                    return;
                }

                cardsContainer.innerHTML = '';
                for (let i = 0; i < cardCount; i++) {
                    const card = availableCards[i];
                    createCardElement(card, cardType);

                    soldCards.push({
                        type: cardType,
                        username: card.Login,
                        password: card.Password,
                        date: new Date().toLocaleString(),
                        uptime: card['Uptime Limit'] || 'غير محدد'
                    });
                }

                localStorage.setItem('soldCards', JSON.stringify(soldCards));
            })
            .catch(error => {
                console.error('Error:', error);
                alert(`خطأ في تحميل ملف ${cardType}.js - تأكد من وجود الملف`);
            });
    });

    function parseCSV(csv) {
        const lines = csv.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = values[i] || '';
            });
            return obj;
        });
    }

    function createCardElement(card, cardType) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';

        const loginUrl = `http://www.bashafai.net/login?username=${card.Login}&password=${card.Password}`;

        const qrContainer = document.createElement('div');
        new QRCode(qrContainer, {
            text: loginUrl,
            width: 150,
            height: 150,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        qrContainer.className = 'qr-code';

        cardElement.innerHTML = `
            <div class="card-header">كرت شحن ${cardType} نقطة</div>
            <div class="card-details">
                <div class="detail-row">
                    <span class="detail-label">اسم المستخدم:</span>
                    <span class="detail-value">${card.Login}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">كلمة المرور:</span>
                    <span class="detail-value">${card.Password}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">مدة الصلاحية:</span>
                    <span class="detail-value">${card['Uptime Limit'] || 'غير محدد'}</span>
                </div>
            </div>
            <div class="card-footer">${new Date().toLocaleDateString()}</div>
        `;

        cardElement.insertBefore(qrContainer, cardElement.querySelector('.card-details'));

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-primary';
        saveBtn.textContent = 'حفظ الكرت';
        saveBtn.style.marginTop = '10px';
        saveBtn.addEventListener('click', function() {
            showCardPreview({
                type: cardType,
                username: card.Login,
                password: card.Password,
                uptime: card['Uptime Limit'] || 'غير محدد',
                date: new Date().toLocaleDateString()
            });
        });

        cardElement.querySelector('.card-footer').after(saveBtn);
        cardsContainer.appendChild(cardElement);
    }

    // باقي الدوال (displaySales, showCardPreview) تبقى كما هي بدون تغيير
    salesBtn.addEventListener('click', function() {
        displaySales();
        salesModal.style.display = 'flex';
    });

    closeModal.addEventListener('click', function() {
        salesModal.style.display = 'none';
    });

    closePreview.addEventListener('click', function() {
        previewContainer.style.display = 'none';
    });

    savePreviewBtn.addEventListener('click', function() {
        const cardElement = previewCard.firstChild;
        const tempCard = cardElement.cloneNode(true);

        const buttons = tempCard.querySelectorAll('button');
        buttons.forEach(btn => btn.remove());

        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.appendChild(tempCard);
        document.body.appendChild(tempContainer);

        html2canvas(tempCard, {
            scale: 2,
            backgroundColor: null
        }).then(canvas => {
            const link = document.createElement('a');
            const cardType = tempCard.querySelector('.card-header').textContent.replace('كرت شحن', '').replace('نقطة', '').trim();
            const username = tempCard.querySelector('.detail-value').textContent;
            link.download = `card_${cardType}_${username}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            document.body.removeChild(tempContainer);
        });
    });

    window.addEventListener('click', function(event) {
        if (event.target === salesModal) salesModal.style.display = 'none';
        if (event.target === previewContainer) previewContainer.style.display = 'none';
    });

    function displaySales() {
        salesList.innerHTML = '';

        if (soldCards.length === 0) {
            salesList.innerHTML = '<p>لا توجد مبيعات مسجلة</p>';
            return;
        }

        const salesByType = {};
        soldCards.forEach(sale => {
            salesByType[sale.type] = (salesByType[sale.type] || 0) + 1;
        });

        const statsElement = document.createElement('div');
        statsElement.className = 'sale-item';
        statsElement.style.backgroundColor = '#eaf2f8';
        statsElement.style.marginBottom = '20px';

        let statsHTML = '<h3>إحصائيات المبيعات</h3><div style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 10px;">';
        for (const type in salesByType) {
            statsHTML += `
                <div style="background: #fff; padding: 10px; border-radius: 5px; min-width: 100px; text-align: center;">
                    <div style="font-weight: bold; color: #3498db;">${type}</div>
                    <div>${salesByType[type]} كرت</div>
                </div>
            `;
        }
        statsHTML += '</div>';

        statsElement.innerHTML = statsHTML;
        salesList.appendChild(statsElement);

        soldCards.forEach((sale, index) => {
            const saleItem = document.createElement('div');
            saleItem.className = 'sale-item';
            saleItem.innerHTML = `
                <div class="sale-info">
                    <span><strong>نوع الكرت:</strong> ${sale.type} نقطة</span>
                    <span><strong>اسم المستخدم:</strong> ${sale.username}</span>
                    <span><strong>التاريخ:</strong> ${sale.date}</span>
                </div>
                <div class="sale-actions">
                    <button class="btn-primary view-sale-btn" data-index="${index}">عرض الكرت</button>
                    <button class="btn-secondary delete-sale-btn" data-index="${index}">حذف</button>
                </div>
            `;

            saleItem.querySelector('.delete-sale-btn').addEventListener('click', function() {
                soldCards.splice(index, 1);
                localStorage.setItem('soldCards', JSON.stringify(soldCards));
                displaySales();
            });

            saleItem.querySelector('.view-sale-btn').addEventListener('click', function() {
                showCardPreview(sale);
            });

            salesList.appendChild(saleItem);
        });
    }

    function showCardPreview(sale) {
        previewCard.innerHTML = '';

        const cardElement = document.createElement('div');
        cardElement.className = 'card';

        const loginUrl = `http://www.bashafai.net/login?username=${sale.username}&password=${sale.password}`;

        const qrContainer = document.createElement('div');
        new QRCode(qrContainer, {
            text: loginUrl,
            width: 150,
            height: 150,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        qrContainer.className = 'qr-code';

        cardElement.innerHTML = `
            <div class="card-header">كرت شحن ${sale.type} نقطة</div>
            <div class="card-details">
                <div class="detail-row">
                    <span class="detail-label">اسم المستخدم:</span>
                    <span class="detail-value">${sale.username}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">كلمة المرور:</span>
                    <span class="detail-value">${sale.password}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">مدة الصلاحية:</span>
                    <span class="detail-value">${sale.uptime || 'غير محدد'}</span>
                </div>
            </div>
            <div class="card-footer">${sale.date}</div>
        `;

        cardElement.insertBefore(qrContainer, cardElement.querySelector('.card-details'));

        previewCard.appendChild(cardElement);
        previewContainer.style.display = 'flex';
    }
});