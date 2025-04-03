document.addEventListener('DOMContentLoaded', function() {
    const cardTypeSelect = document.getElementById('card-type');
    const cardCountInput = document.getElementById('card-count');
    const generateBtn = document.getElementById('generate-btn');
    const salesBtn = document.getElementById('sales-btn');
    const cardsContainer = document.getElementById('cards-container');
    const salesModal = document.getElementById('sales-modal');
    const salesList = document.getElementById('sales-list');
    const closeModal = document.querySelector('.close-modal');

    // تحميل الكروت المباعة من localStorage
    let soldCards = JSON.parse(localStorage.getItem('soldCards')) || [];

    // حدث زر إنشاء الكروت
    generateBtn.addEventListener('click', function() {
        const cardType = cardTypeSelect.value;
        const cardCount = parseInt(cardCountInput.value);

        if (cardCount < 1) {
            alert('الرجاء إدخال عدد صحيح موجب');
            return;
        }

        // جلب الكروت من الملف المناسب
        fetch(`cards/${cardType}.js`)
            .then(response => response.text())
            .then(data => {
                // تحويل البيانات من نص إلى مصفوفة
                const cards = parseCSV(data);

                // تصفية الكروت غير المباعة
                const availableCards = cards.filter(card =>
                    !soldCards.some(sold =>
                        sold.username === card.Login &&
                        sold.password === card.Password
                    )
                );

                if (availableCards.length < cardCount) {
                    alert(`لا يوجد سوى ${availableCards.length} كرت متاح من هذا النوع`);
                    return;
                }

                // إنشاء الكروت المطلوبة
                cardsContainer.innerHTML = '';
                for (let i = 0; i < cardCount; i++) {
                    const card = availableCards[i];
                    createCardElement(card, cardType);

                    // إضافة الكرت إلى قائمة المباعة
                    soldCards.push({
                        type: cardType,
                        username: card.Login,
                        password: card.Password,
                        date: new Date().toLocaleString()
                    });
                }

                // حفظ الكروت المباعة في localStorage
                localStorage.setItem('soldCards', JSON.stringify(soldCards));
            })
            .catch(error => {
                console.error('Error loading cards:', error);
                alert('حدث خطأ أثناء تحميل الكروت');
            });
    });

    // حدث زر عرض المبيعات
    salesBtn.addEventListener('click', function() {
        displaySales();
        salesModal.style.display = 'flex';
    });

    // حدث إغلاق نافذة المبيعات
    closeModal.addEventListener('click', function() {
        salesModal.style.display = 'none';
    });

    // إغلاق النافذة عند النقر خارجها
    window.addEventListener('click', function(event) {
        if (event.target === salesModal) {
            salesModal.style.display = 'none';
        }
    });

    // دالة لتحويل بيانات CSV إلى مصفوفة
    function parseCSV(csv) {
        const lines = csv.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = values[i];
            });
            return obj;
        });
    }

    // دالة لإنشاء عنصر كرت
    function createCardElement(card, cardType) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';

        // إنشاء رابط الدخول
        const loginUrl = `http://www.bashafai.net/login?username=${card.Login}&password=${card.Password}`;

        // إنشاء الباركود
        const qrContainer = document.createElement('div');
        new QRCode(qrContainer, {
            text: loginUrl,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        qrContainer.className = 'qr-code';

        // إنشاء محتوى الكرت
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
                    <span class="detail-value">${card['Uptime Limit']}</span>
                </div>
            </div>
            <div class="card-footer">${new Date().toLocaleDateString()}</div>
        `;

        // إضافة الباركود إلى الكرت
        cardElement.insertBefore(qrContainer, cardElement.querySelector('.card-details'));

        // إضافة زر الحفظ
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-primary';
        saveBtn.textContent = 'حفظ الكرت';
        saveBtn.style.marginTop = '10px';
        saveBtn.addEventListener('click', function() {
            saveCardAsImage(cardElement, cardType, card.Login);
        });

        cardElement.querySelector('.card-footer').after(saveBtn);

        // إضافة الكرت إلى الواجهة
        cardsContainer.appendChild(cardElement);
    }

    // دالة لعرض المبيعات
    function displaySales() {
        salesList.innerHTML = '';

        if (soldCards.length === 0) {
            salesList.innerHTML = '<p>لا توجد مبيعات مسجلة</p>';
            return;
        }

        // تجميع المبيعات حسب النوع
        const salesByType = {};
        soldCards.forEach(sale => {
            if (!salesByType[sale.type]) {
                salesByType[sale.type] = 0;
            }
            salesByType[sale.type]++;
        });

        // عرض الإحصائيات
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

        // عرض تفاصيل المبيعات
        soldCards.forEach((sale, index) => {
            const saleItem = document.createElement('div');
            saleItem.className = 'sale-item';
            saleItem.innerHTML = `
                <div class="sale-info">
                    <span><strong>نوع الكرت:</strong> ${sale.type} نقطة</span>
                    <span><strong>اسم المستخدم:</strong> ${sale.username}</span>
                    <span><strong>التاريخ:</strong> ${sale.date}</span>
                </div>
                <button class="btn-secondary" data-index="${index}">حذف</button>
            `;

            saleItem.querySelector('button').addEventListener('click', function() {
                soldCards.splice(index, 1);
                localStorage.setItem('soldCards', JSON.stringify(soldCards));
                displaySales();
            });

            salesList.appendChild(saleItem);
        });
    }

    // دالة لحفظ الكرت كصورة
    function saveCardAsImage(cardElement, cardType, username) {
        // يمكن استخدام مكتبة مثل html2canvas لتحويل العنصر إلى صورة
        // هذا مثال نظري حيث يحتاج إلى تنفيذ فعلي
        alert(`تم حفظ كرت ${cardType} للمستخدم ${username}`);
        // في التنفيذ الفعلي:
        // html2canvas(cardElement).then(canvas => {
        //     const link = document.createElement('a');
        //     link.download = `card_${username}.png`;
        //     link.href = canvas.toDataURL();
        //     link.click();
        // });
    }
});