document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reviewForm');
    const recentReviews = document.getElementById('recentReviews');
    const refreshButton = document.getElementById('refreshReviews');
    const apiBase = 'http://localhost:5000/api/reviews';
    const toastStack = document.createElement('div');
    toastStack.className = 'toast-stack';
    document.body.appendChild(toastStack);

    const reviewKeys = ['rating', 'punctuality', 'professionalism', 'valueForMoney'];

    const showToast = (type, title, message, duration = 2800) => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-message">${message}</div>`;
        toastStack.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, duration);
    };

    const stars = (count) => '★★★★★'.slice(0, count) + '☆☆☆☆☆'.slice(0, 5 - count);

    const parseResponse = async (response) => {
        const raw = await response.text();
        if (!raw) return {};
        try {
            return JSON.parse(raw);
        } catch {
            return { message: raw };
        }
    };

    const syncRating = (field, value, card) => {
        const hidden = form.querySelector(`input[name="${field}"]`);
        if (hidden) hidden.value = String(value);
        if (card) {
            card.querySelectorAll('.rating-pill').forEach((pill, idx) => {
                pill.classList.toggle('active', idx < value);
            });
        }
    };

    const buildRatingControl = (card) => {
        const field = card.dataset.field;
        const initial = Number(form.querySelector(`input[name="${field}"]`)?.value || 5);
        card.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'rating-pill';
            btn.innerHTML = `<span>${i}</span>`;
            btn.addEventListener('click', () => syncRating(field, i, card));
            card.appendChild(btn);
        }
        syncRating(field, initial, card);
    };

    const renderReviews = (reviews) => {
        if (!recentReviews) return;
        recentReviews.innerHTML = '';

        if (!reviews.length) {
            recentReviews.innerHTML = `<div class="empty-state">No feedback yet. Be the first to share a useful review.</div>`;
            return;
        }

        reviews.forEach((review) => {
            const item = document.createElement('article');
            item.className = 'review-item';
            item.innerHTML = `
                <div class="review-top">
                    <div>
                        <h4 class="review-title">${review.title || review.serviceName}</h4>
                        <div class="review-meta">${review.reviewerName} · ${review.serviceName} · ${new Date(review.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <span class="tag">${String(review.urgency || 'medium').toUpperCase()}</span>
                </div>
                <div class="rating-line">${stars(Number(review.rating || 0))}</div>
                <p style="margin: 10px 0 0; color: #334155; line-height: 1.6;">${review.comment}</p>
                <div style="margin-top: 10px; display:flex; gap:10px; flex-wrap:wrap;">
                    <span class="tag">Punctuality: ${review.punctuality || review.rating}/5</span>
                    <span class="tag">Professionalism: ${review.professionalism || review.rating}/5</span>
                    <span class="tag">Value: ${review.valueForMoney || review.rating}/5</span>
                    <span class="tag">${review.recommend ? 'Recommend' : 'Needs review'}</span>
                </div>
            `;
            recentReviews.appendChild(item);
        });
    };

    const loadStats = async () => {
        try {
            const response = await fetch(`${apiBase}/stats`);
            const payload = await parseResponse(response);
            if (!response.ok || !payload.success) throw new Error(payload.message || 'Could not load stats');
            const stats = payload.data || {};
            document.getElementById('statTotal').textContent = String(stats.total ?? 0);
            document.getElementById('statAvg').textContent = String(stats.avgRating ?? 0).replace(/\.0$/, '.0');
            document.getElementById('statRecommend').textContent = `${stats.recommendRate ?? 0}%`;
            document.getElementById('statUrgent').textContent = String(stats.urgentCount ?? 0);
        } catch (error) {
            console.error('Stats load failed:', error);
        }
    };

    const loadReviews = async () => {
        try {
            const response = await fetch(`${apiBase}?limit=8`);
            const payload = await parseResponse(response);
            if (!response.ok || !payload.success) throw new Error(payload.message || 'Could not load reviews');
            renderReviews(Array.isArray(payload.data) ? payload.data : []);
        } catch (error) {
            console.error('Review load failed:', error);
            const fallback = JSON.parse(localStorage.getItem('localReviews') || '[]');
            renderReviews(fallback);
        }
    };

    reviewKeys.forEach((field) => {
        const card = form.querySelector(`.rating-input[data-field="${field}"]`);
        if (card) buildRatingControl(card);
    });

    const submitReview = async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const payload = {
            reviewerName: String(formData.get('reviewerName') || '').trim(),
            reviewerRole: 'user',
            serviceName: String(formData.get('serviceName') || '').trim(),
            rating: Number(formData.get('rating') || 5),
            punctuality: Number(formData.get('punctuality') || 5),
            professionalism: Number(formData.get('professionalism') || 5),
            valueForMoney: Number(formData.get('valueForMoney') || 5),
            recommend: formData.get('recommend') === 'on',
            urgency: String(formData.get('urgency') || 'medium'),
            title: String(formData.get('title') || '').trim(),
            comment: String(formData.get('comment') || '').trim()
        };

        if (!payload.reviewerName || !payload.serviceName || !payload.comment) {
            showToast('info', 'Missing details', 'Please fill in your name, service, and feedback comment.');
            return;
        }

        try {
            const response = await fetch(apiBase, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await parseResponse(response);
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Could not submit feedback');
            }

            const localReviews = JSON.parse(localStorage.getItem('localReviews') || '[]');
            localReviews.unshift(data.data);
            localStorage.setItem('localReviews', JSON.stringify(localReviews.slice(0, 20)));

            form.reset();
            reviewKeys.forEach((field) => {
                const card = form.querySelector(`.rating-input[data-field="${field}"]`);
                if (card) syncRating(field, 5, card);
            });

            showToast('success', 'Feedback saved', 'Your review has been stored and will help future company decisions.');
            await loadStats();
            await loadReviews();
        } catch (error) {
            console.error('Submit review failed:', error);
            showToast('error', 'Could not submit', error.message || 'Try again later.');
        }
    };

    if (form) form.addEventListener('submit', submitReview);
    if (refreshButton) refreshButton.addEventListener('click', () => { loadStats(); loadReviews(); });

    loadStats();
    loadReviews();
});