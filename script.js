document.addEventListener('DOMContentLoaded', function() {
    // العناصر الأساسية
    const cardTypeSelect = document.getElementById('card-type');
    const cardCountInput = document.getElementById('card-count');
    const generateBtn = document.getElementById('generate-btn');
    const salesBtn = document.getElementById('sales-btn');
    const clearBtn = document.getElementById('clear-btn');
    const cardsContainer = document.getElementById('cards-container');
    const cardsStats = document.getElementById('cards-stats');
    
    // عناصر نافذة المبيعات
    const salesModal = document.getElementById('sales-modal');
    const closeModal = document.querySelector('.close-modal');
    const todayTab = document.getElementById('today-sales');
    const historyTab = document.getElementById('history-sales');
    const todayList = document.getElementById('today-list');
    const historyList = document.getElementById('history-list');
    const historyDate = document.getElementById('history-date');
    const loadHistoryBtn = document.getElementById('load-history');
    const salesSummary = document.getElementById('sales-summary');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    // عناصر نافذة التنبيه
    const alertModal = document.getElementById('alert-modal');
    const alertTitle = document.getElementById('alert-title');
    const alertMessage = document.getElementById('alert-message');
    const alertButtons = document.getElementById('alert-buttons');

    // البيانات
    let soldCards = JSON.parse(localStorage.getItem('soldCards')) || [];
    let currentCards = [];
    let allCardsData = {};

    // تهيئة التاريخ الحالي
    historyDate.valueAsDate = new Date();

    // تحميل جميع الكروت عند بدء التشغيل
    loadAllCards();

    // أحداث التبويبات
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            document.getElementById(`${this.dataset.tab}-sales`).classList.add('active');
            
            if (this.dataset.tab === 'today') {
                displayTodaySales();
            }
        });
    });

    // أحداث الأزرار
    generateBtn.addEventListener('click', generateCardsHandler);
    salesBtn.addEventListener('click', displaySales);
    clearBtn.addEventListener('click', clearCardsHandler);
    closeModal.addEventListener('click', () => salesModal.style.display = 'none');
    loadHistoryBtn.addEventListener('click', loadHistoryHandler);

    // أحداث النقر خارج النوافذ
    window.addEventListener('click', function(event) {
        if (event.target === salesModal) salesModal.style.display = 'none';
        if (event.target === alertModal) alertModal.style.display = 'none';
    });

    // الدوال الرئيسية
    async function loadAllCards() {
        const cardTypes = ['200', '500', '1000', '2000', '5000', '10000'];
        
        for (const type of cardTypes) {
            try {
                const response = await fetch(`cards/${type}.js`);
                if (response.ok) {
                    const text = await response.text();
                    const jsonStr = text.replace(/\/\/.*$/gm, '');
                    allCardsData[type] = JSON.parse(jsonStr);
                }
            } catch (error) {
                console.error(`Error loading ${type} cards:`, error);
            }
        }
        
        updateCardsStats();
    }

    async function generateCardsHandler() {
        const cardType = cardTypeSelect.value;
        const cardCount = parseInt(cardCountInput.value);
        
        if (cardCount < 1) {
            showAlert('خطأ', 'الرجاء إدخال عدد صحيح موجب');
            return;
        }

        try {
            if (!allCardsData[cardType]) {
                const response = await fetch(`cards/${cardType}.js`);
                if (!response.ok) {
                    showAlert('خطأ', `ملف كروت ${cardType} غير موجود`);
                    return;
                }
                const text = await response.text();
                const jsonStr = text.replace(/\/\/.*$/gm, '');
                allCardsData[cardType] = JSON.parse(jsonStr);
            }
            
            const availableCards = allCardsData[cardType].filter(card => 
                !soldCards.some(sold => 
                    sold.username === card.Login && 
                    sold.password === card.Password
                )
            );

            if (availableCards.length === 0) {
                showAlert('تنبيه', `تم استنفاذ جميع كروت ${cardType} نقطة`);
                return;
            }

            if (cardCount > availableCards.length) {
                showConfirm(
                    'تنبيه',
                    `لا يوجد سوى ${availableCards.length} كرت متاح من هذا النوع. هل تريد طباعة الكروت المتاحة؟`,
                    () => generateCards(cardType, availableCards, availableCards.length)
                );
                return;
            }

            generateCards(cardType, availableCards, cardCount);
            
        } catch (error) {
            showAlert('خطأ', 'حدث خطأ أثناء تحميل الكروت: ' + error.message);
        }
    }

    function generateCards(cardType, availableCards, count) {
        cardsContainer.innerHTML = '';
        currentCards = [];
        
        for (let i = 0; i < count; i++) {
            const card = availableCards[i];
            createCardElement(card, cardType);
            
            const soldCard = {
                type: cardType,
                username: card.Login,
                password: card.Password,
                date: new Date().toLocaleString()
            };
            
            soldCards.push(soldCard);
            currentCards.push(soldCard);
        }

        localStorage.setItem('soldCards', JSON.stringify(soldCards));
        updateCardsStats();
        showAlert('نجاح', `تم إنشاء ${count} كرت بنجاح`, false);
    }

    function clearCardsHandler() {
        if (currentCards.length > 0) {
            showConfirm(
                'تنبيه',
                'هل تريد مسح الكروت الحالية وطباعة كروت جديدة؟',
                () => {
                    cardsContainer.innerHTML = '';
                    currentCards = [];
                }
            );
        } else {
            showAlert('تنبيه', 'لا توجد كروت معروضة حالياً');
        }
    }

    function loadHistoryHandler() {
        const selectedDate = new Date(historyDate.value);
        displayHistorySales(selectedDate);
    }

    function displaySales() {
        salesModal.style.display = 'flex';
        displayTodaySales();
    }

    function displayTodaySales() {
        const today = getToday();
        const todaySales = soldCards.filter(sale => {
            const saleDate = new Date(sale.date);
            saleDate.setHours(0, 0, 0, 0);
            return saleDate.getTime() === today.getTime();
        });
        
        renderSalesList(todayList, todaySales);
        updateSalesSummary(todaySales);
    }

    function displayHistorySales(date) {
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const historySales = soldCards.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= date && saleDate < nextDay;
        });
        
        renderSalesList(historyList, historySales);
        updateSalesSummary(historySales);
    }

    // الدوال المساعدة
    function getToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    }

    function updateCardsStats() {
        cardsStats.innerHTML = '';
        
        for (const type in allCardsData) {
            if (allCardsData[type]) {
                const availableCards = allCardsData[type].filter(card => 
                    !soldCards.some(sold => 
                        sold.username === card.Login && 
                        sold.password === card.Password
                    )
                ).length;
                
                const statElement = document.createElement('div');
                statElement.className = 'card-stat';
                statElement.innerHTML = `
                    <div class="type">${type} نقطة</div>
                    <div class="count">${availableCards}</div>
                `;
                
                cardsStats.appendChild(statElement);
            }
        }
    }

    function renderSalesList(container, sales) {
        container.innerHTML = '';
        
        if (sales.length === 0) {
            container.innerHTML = '<p>لا توجد مبيعات مسجلة</p>';
            return;
        }
        
        sales.forEach((sale, index) => {
            const saleItem = document.createElement('div');
            saleItem.className = 'sale-item';
            saleItem.innerHTML = `
                <div class="sale-info">
                    <span><strong>نوع الكرت:</strong> ${sale.type} نقطة</span>
                    <span><strong>اسم المستخدم:</strong> ${sale.username}</span>
                    <span><strong>التاريخ:</strong> ${sale.date}</span>
                </div>
            `;
            container.appendChild(saleItem);
        });
    }

    function updateSalesSummary(sales) {
        const summary = sales.reduce((acc, sale) => {
            if (!acc[sale.type]) {
                acc[sale.type] = 0;
            }
            acc[sale.type]++;
            acc.total++;
            return acc;
        }, {total: 0});
        
        salesSummary.innerHTML = `
            <h3>ملخص المبيعات</h3>
            <div class="summary-row">
                <span class="summary-label">إجمالي المبيعات:</span>
                <span class="summary-value">${summary.total}</span>
            </div>
            ${Object.keys(summary)
                .filter(k => k !== 'total')
                .map(type => `
                    <div class="summary-row">
                        <span class="summary-label">${type} نقطة:</span>
                        <span class="summary-value">${summary[type]}</span>
                    </div>
                `).join('')}
        `;
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
                    <span class="detail-value">${card['Uptime Limit']}</span>
                </div>
            </div>
            <div class="card-footer">${new Date().toLocaleDateString()}</div>
        `;
        
        cardElement.insertBefore(qrContainer, cardElement.querySelector('.card-details'));
        cardsContainer.appendChild(cardElement);
    }

    function showAlert(title, message, showCancel = false) {
        alertTitle.textContent = title;
        alertMessage.textContent = message;
        
        alertButtons.innerHTML = '';
        const okBtn = document.createElement('button');
        okBtn.className = 'btn-primary';
        okBtn.textContent = 'موافق';
        okBtn.onclick = () => alertModal.style.display = 'none';
        alertButtons.appendChild(okBtn);
        
        if (showCancel) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn-secondary';
            cancelBtn.textContent = 'إلغاء';
            cancelBtn.onclick = () => alertModal.style.display = 'none';
            alertButtons.appendChild(cancelBtn);
        }
        
        alertModal.style.display = 'flex';
    }

    function showConfirm(title, message, confirmCallback) {
        alertTitle.textContent = title;
        alertMessage.textContent = message;
        
        alertButtons.innerHTML = '';
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn-primary';
        confirmBtn.textContent = 'نعم';
        confirmBtn.onclick = () => {
            alertModal.style.display = 'none';
            confirmCallback();
        };
        alertButtons.appendChild(confirmBtn);
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'لا';
        cancelBtn.onclick = () => alertModal.style.display = 'none';
        alertButtons.appendChild(cancelBtn);
        
        alertModal.style.display = 'flex';
    }
});
