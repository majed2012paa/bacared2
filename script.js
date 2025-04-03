document.addEventListener('DOMContentLoaded', function() {
    const cardTypeSelect = document.getElementById('card-type');
    const cardCountInput = document.getElementById('card-count');
    const generateBtn = document.getElementById('generate-btn');
    const salesBtn = document.getElementById('sales-btn');
    const clearBtn = document.getElementById('clear-btn');
    const cardsContainer = document.getElementById('cards-container');
    const salesModal = document.getElementById('sales-modal');
    const salesList = document.getElementById('sales-list');
    const closeModal = document.querySelector('.close-modal');
    const alertModal = document.getElementById('alert-modal');
    const alertTitle = document.getElementById('alert-title');
    const alertMessage = document.getElementById('alert-message');
    const alertButtons = document.getElementById('alert-buttons');
    const alertConfirm = document.getElementById('alert-confirm');
    const alertCancel = document.getElementById('alert-cancel');

    // تحميل الكروت المباعة من localStorage
    let soldCards = JSON.parse(localStorage.getItem('soldCards')) || [];
    let currentCards = [];

    // حدث زر إنشاء الكروت
    generateBtn.addEventListener('click', async function() {
        const cardType = cardTypeSelect.value;
        const cardCount = parseInt(cardCountInput.value);

        if (cardCount < 1) {
            showAlert('خطأ', 'الرجاء إدخال عدد صحيح موجب');
            return;
        }

        try {
            // جلب الكروت من الملف المناسب
            const response = await fetch(`cards/${cardType}.js`);

            // التحقق من وجود الملف
            if (!response.ok) {
                showAlert('خطأ', `ملف كروت ${cardType} غير موجود`);
                return;
            }

            const data = await response.text();

            // تحويل البيانات من نص إلى مصفوفة
            const cards = parseCSV(data);

            // تصفية الكروت غير المباعة
            const availableCards = cards.filter(card =>
                !soldCards.some(sold =>
                    sold.username === card.Login &&
                    sold.password === card.Password
                )
            );

            // التحقق من وجود كروت متاحة
            if (availableCards.length === 0) {
                showAlert('تنبيه', `تم استنفاذ جميع كروت ${cardType} نقطة`);
                return;
            }

            // التحقق إذا كان العدد المطلوب أكبر من المتاح
            if (cardCount > availableCards.length) {
                showConfirm(
                    'تنبيه',
                    `لا يوجد سوى ${availableCards.length} كرت متاح من هذا النوع. هل تريد طباعة الكروت المتاحة؟`,
                    function() {
                        generateCards(cardType, availableCards, availableCards.length);
                    }
                );
                return;
            }

            // إنشاء الكروت المطلوبة
            generateCards(cardType, availableCards, cardCount);

        } catch (error) {
            console.error('Error loading cards:', error);
            showAlert('خطأ', 'حدث خطأ أثناء تحميل الكروت');
        }
    });

    // دالة لإنشاء الكروت
    function generateCards(cardType, availableCards, count) {
        cardsContainer.innerHTML = '';
        currentCards = [];

        for (let i = 0; i < count; i++) {
            const card = availableCards[i];
            createCardElement(card, cardType);

            // إضافة الكرت إلى قائمة المباعة
            const soldCard = {
                type: cardType,
                username: card.Login,
                password: card.Password,
                date: new Date().toLocaleString()
            };

            soldCards.push(soldCard);
            currentCards.push(soldCard);
        }

        // حفظ الكروت المباعة في localStorage
        localStorage.setItem('soldCards', JSON.stringify(soldCards));

        // إعلام المستخدم بنجاح العملية
        showAlert('نجاح', `تم إنشاء ${count} كرت بنجاح`, false);
    }

    // حدث زر عرض المبيعات
    salesBtn.addEventListener('click', function() {
        displaySales();
        salesModal.style.display = 'flex';
    });

    // حدث زر طباعة كروت جديدة
    clearBtn.addEventListener('click', function() {
        if (currentCards.length > 0) {
            showConfirm(
                'تنبيه',
                'هل تريد مسح الكروت الحالية وطباعة كروت جديدة؟',
                function() {
                    cardsContainer.innerHTML = '';
                    currentCards = [];
                }
            );
        } else {
            showAlert('تنبيه', 'لا توجد كروت معروضة حالياً');
        }
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
        if (event.target === alertModal) {
            alertModal.style.display = 'none';
        }
    });

    // دالة لعرض التنبيه
    function showAlert(title, message, showCancel = false) {
        alertTitle.textContent = title;
        alertMessage.textContent = message;

        alertButtons.innerHTML = '';
        const okBtn = document.createElement('button');
        okBtn.className = 'btn-primary';
        okBtn.textContent = 'موافق';
        okBtn.onclick = function() {
            alertModal.style.display = 'none';
        };
        alertButtons.appendChild(okBtn);

        if (showCancel) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn-secondary';
            cancelBtn.textContent = 'إلغاء';
            cancelBtn.onclick = function() {
                alertModal.style.display = 'none';
            };
            alertButtons.appendChild(cancelBtn);
        }

        alertModal.style.display = 'flex';
    }

    // دالة لعرض تأكيد مع خيارين
    function showConfirm(title, message, confirmCallback) {
        alertTitle.textContent = title;
        alertMessage.textContent = message;

        alertButtons.innerHTML = '';

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn-primary';
        confirmBtn.textContent = 'نعم';
        confirmBtn.onclick = function() {
            alertModal.style.display = 'none';
            confirmCallback();
        };
        alertButtons.appendChild(confirmBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'لا';
        cancelBtn.onclick = function() {
            alertModal.style.display = 'none';
        };
        alertButtons.appendChild(cancelBtn);

        alertModal.style.display = 'flex';
    }

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
            width: 150,
            height: 150,
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

        // عرض تفاصيل المبيعات (أحدث 50 عملية فقط)
        const recentSales = soldCards.slice(-50).reverse();
        recentSales.forEach((sale, index) => {
            const saleItem = document.createElement('div');
            saleItem.className = 'sale-item';
            saleItem.innerHTML = `
                <div class="sale-info">
                    <span><strong>نوع الكرت:</strong> ${sale.type} نقطة</span>
                    <span><strong>اسم المستخدم:</strong> ${sale.username}</span>
                    <span><strong>التاريخ:</strong> ${sale.date}</span>
                </div>
                <button class="btn-secondary" data-index="${soldCards.length - 1 - index}">حذف</button>
            `;

            saleItem.querySelector('button').addEventListener('click', function() {
                soldCards.splice(soldCards.length - 1 - index, 1);
                localStorage.setItem('soldCards', JSON.stringify(soldCards));
                displaySales();
            });

            salesList.appendChild(saleItem);
        });
    }
});