document.addEventListener('DOMContentLoaded', function() {
    // العناصر الأساسية في الواجهة
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

    // الكروت المباعة
    let soldCards = JSON.parse(localStorage.getItem('soldCards')) || [];

    // زر إنشاء الكروت
    generateBtn.addEventListener('click', generateCards);

    // زر عرض المبيعات
    salesBtn.addEventListener('click', showSales);

    // إغلاق نافذة المبيعات
    closeModal.addEventListener('click', hideSalesModal);

    // إغلاق نافذة المعاينة
    closePreview.addEventListener('click', hidePreview);

    // حفظ الكرت من المعاينة
    savePreviewBtn.addEventListener('click', saveCardFromPreview);

    // النقر خارج النوافذ لإغلاقها
    window.addEventListener('click', function(event) {
        if (event.target === salesModal) hideSalesModal();
        if (event.target === previewContainer) hidePreview();
    });

    // دالة إنشاء الكروت
    function generateCards() {
        const cardType = cardTypeSelect.value;
        const cardCount = parseInt(cardCountInput.value);

        if (cardCount < 1) {
            alert('الرجاء إدخال عدد صحيح موجب');
            return;
        }

        fetch(`cards/${cardType}.js`)
            .then(response => {
                if (!response.ok) throw new Error('الملف غير موجود');
                return response.text();
            })
            .then(data => {
                const cards = parseCSV(data);
                const availableCards = getAvailableCards(cards);

                if (availableCards.length === 0) {
                    alert('لا توجد كروت متاحة في هذا الملف');
                    return;
                }

                if (availableCards.length < cardCount) {
                    alert(`لا يوجد سوى ${availableCards.length} كرت متاح من هذا النوع`);
                    return;
                }

                displayCards(availableCards.slice(0, cardCount), cardType);
                updateSoldCards(availableCards.slice(0, cardCount), cardType);
            })
            .catch(error => {
                console.error('Error:', error);
                alert(`خطأ في تحميل الكروت:\n${error.message}\nتأكد من:\n1. وجود ملف ${cardType}.js في مجلد cards/\n2. أن الملف يحتوي على بيانات صحيحة`);
            });
    }

    // دالة تحليل بيانات CSV
    function parseCSV(csvData) {
        const lines = csvData.split('\n')
            .filter(line => line.trim() !== '' && !line.trim().startsWith('//'));

        if (lines.length < 2) {
            throw new Error('الملف لا يحتوي على بيانات كافية');
        }

        const headers = lines[0].split(',')
            .map(h => h.trim().replace(/"/g, ''));

        return lines.slice(1).map(line => {
            const values = line.split(',')
                .map(v => v.trim().replace(/"/g, ''));
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = values[i] || '';
            });
            return obj;
        });
    }

    // الحصول على الكروت المتاحة
    function getAvailableCards(cards) {
        return cards.filter(card =>
            card.Login && card.Password &&
            !soldCards.some(s => s.username === card.Login && s.password === card.Password)
        );
    }

    // عرض الكروت في الواجهة
    function displayCards(cards, cardType) {
        cardsContainer.innerHTML = '';
        cards.forEach(card => {
            const cardElement = createCardElement(card, cardType);
            cardsContainer.appendChild(cardElement);
        });
    }

    // إنشاء عنصر كرت
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
        saveBtn.addEventListener('click', () => showCardPreview({
            type: cardType,
            username: card.Login,
            password: card.Password,
            uptime: card['Uptime Limit'] || 'غير محدد',
            date: new Date().toLocaleDateString()
        }));

        cardElement.querySelector('.card-footer').after(saveBtn);
        return cardElement;
    }

    // تحديث الكروت المباعة
    function updateSoldCards(cards, cardType) {
        cards.forEach(card => {
            soldCards.push({
                type: cardType,
                username: card.Login,
                password: card.Password,
                date: new Date().toLocaleString(),
                uptime: card['Uptime Limit'] || 'غير محدد'
            });
        });
        localStorage.setItem('soldCards', JSON.stringify(soldCards));
    }

    // عرض المبيعات
    function showSales() {
        salesList.innerHTML = '';

        if (soldCards.length === 0) {
            salesList.innerHTML = '<p>لا توجد مبيعات مسجلة</p>';
            salesModal.style.display = 'flex';
            return;
        }

        displaySalesStats();
        displaySalesItems();
        salesModal.style.display = 'flex';
    }

    // عرض إحصائيات المبيعات
    function displaySalesStats() {
        const salesByType = soldCards.reduce((acc, sale) => {
            acc[sale.type] = (acc[sale.type] || 0) + 1;
            return acc;
        }, {});

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
    }

    // عرض عناصر المبيعات
    function displaySalesItems() {
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

            saleItem.querySelector('.delete-sale-btn').addEventListener('click', () => deleteSale(index));
            saleItem.querySelector('.view-sale-btn').addEventListener('click', () => showCardPreview(sale));

            salesList.appendChild(saleItem);
        });
    }

    // حذف عملية بيع
    function deleteSale(index) {
        soldCards.splice(index, 1);
        localStorage.setItem('soldCards', JSON.stringify(soldCards));
        showSales();
    }

    // إخفاء نافذة المبيعات
    function hideSalesModal() {
        salesModal.style.display = 'none';
    }

    // عرض معاينة الكرت
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

    // إخفاء نافذة المعاينة
    function hidePreview() {
        previewContainer.style.display = 'none';
    }

    // حفظ الكرت من المعاينة
    function saveCardFromPreview() {
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
    }
});