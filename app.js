document.addEventListener('DOMContentLoaded', () => {
    // === DOM Elements ===
    const creatorSection = document.getElementById('creator-section');
    const takerSection = document.getElementById('taker-section');
    const quizSection = document.getElementById('quiz-section');
    const shareSection = document.getElementById('share-section');
    const scoreboardSection = document.getElementById('scoreboard-section');
    const resultSection = document.getElementById('result-section');
    const recentQuizzesSection = document.getElementById('recent-quizzes-section');
    // Creator Dashboard elements
    const creatorDashboard = document.getElementById('creator-dashboard');
    const creatorQuizzesList = document.getElementById('creator-quizzes-list');
    const goToDashboardBtn = document.getElementById('go-to-dashboard-btn');
    const createNewQuizBtn = document.getElementById('create-new-quiz-btn');

    const creatorNameInput = document.getElementById('creator-name');
    const takerNameInput = document.getElementById('taker-name');
    const questionsContainer = document.getElementById('questions-container');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const submitBtn = document.getElementById('submit-btn');

    // === Global State ===
    // The allQuestions array is expected from questions.js
    let currentQuizQuestions = [];
    let creatorAnswers = [];
    let takerAnswers = [];
    let currentQuestionIndex = 0;
    let quizId = null;

    // === URL Logic to Determine View ===
    const urlParams = new URLSearchParams(window.location.search);
    quizId = urlParams.get('id');
    const view = urlParams.get('view');

    function showView(section) {
        [
            creatorSection,
            takerSection,
            quizSection,
            shareSection,
            scoreboardSection,
            resultSection,
            recentQuizzesSection,
            creatorDashboard
        ].forEach(s => s.style.display = 'none');
        section.style.display = 'block';
    }

    // === Persistent memory (taker result + creator's last quiz) ===
    const finalQuizResult = JSON.parse(localStorage.getItem('finalQuizResult'));
    const lastCreatedQuiz = JSON.parse(localStorage.getItem('lastCreatedQuiz'));

    // Nicely render a persisted taker result (and avoid nudging them to create a quiz)
    function hydrateResultView(res) {
        showView(resultSection);
        const scoreEl = document.getElementById('final-score');
        if (scoreEl) scoreEl.innerText = `${res.score} / ${res.totalQuestions}`;

        // Replace the default paragraph to link to the scoreboard instead of "create your own"
        const p = resultSection.querySelector('p');
        if (p) {
            const linkHref = res && res.quizId ? `?id=${res.quizId}&view=scoreboard` : '#';
            const friend = res && res.friendName ? `, ${res.friendName}` : '';
            const who = res && res.creatorName ? `${res.creatorName}` : 'the creator';
            p.innerHTML = `Thanks for playing${friend}! This was <strong>${who}</strong>'s quiz. <a href="${linkHref}" id="result-scoreboard-link">View the live scoreboard</a>.`;
        }
    }

    // Creator quizzes list (for dashboard)
    const creatorQuizzes = JSON.parse(localStorage.getItem('myCreatedQuizzes')) || [];

    // === Initial Routing (order matters) ===
    if (quizId && view === 'scoreboard') {
        showView(scoreboardSection);
        loadScoreboard(quizId);
    } else if (quizId && finalQuizResult && finalQuizResult.role === 'taker' && finalQuizResult.quizId === quizId) {
        // Taker coming back to the same quiz → show their saved result
        hydrateResultView(finalQuizResult);
    } else if (!quizId && finalQuizResult && finalQuizResult.role === 'taker') {
        // Taker landing without params → show their latest result
        hydrateResultView(finalQuizResult);
    } else if (!quizId && lastCreatedQuiz && lastCreatedQuiz.quizId) {
        // Creator returning → show scoreboard for last created quiz
        showView(scoreboardSection);
        loadScoreboard(lastCreatedQuiz.quizId);
    } else if (quizId) {
        // Taker arriving to take a quiz
        showView(takerSection);
    } else if (creatorQuizzes.length > 0) {
        // Creator has made quizzes → show dashboard
        showView(creatorDashboard);
        loadCreatorDashboard(creatorQuizzes);
    } else {
        // Fresh landing
        showView(creatorSection);
        loadRecentQuizzes();
    }

    // === Helper Functions ===
    function generateQuizID(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    }

    function renderQuestion(questions, userAnswers) {
        if (questions.length === 0) return;

        const questionData = questions[currentQuestionIndex];
        const selectedOption = userAnswers[currentQuestionIndex];

        questionsContainer.innerHTML = `
            <h3>${currentQuestionIndex + 1}. ${questionData.question}</h3>
            <div class="quiz-options">
                ${questionData.options.map(option => `
                    <div class="quiz-option ${selectedOption === option ? 'selected' : ''}" data-value="${option}">
                        ${option}
                    </div>
                `).join('')}
            </div>
        `;
        document.querySelectorAll('.quiz-option').forEach(optionEl => {
            optionEl.addEventListener('click', () => {
                document.querySelectorAll('.quiz-option').forEach(el => el.classList.remove('selected'));
                optionEl.classList.add('selected');
            });
        });
    }

    // Show recent taker results on the home screen
    function loadRecentQuizzes() {
        const storedResults = JSON.parse(localStorage.getItem('buddyzResults')) || [];
        const container = document.getElementById('recent-quizzes-container');
        container.innerHTML = '';

        if (storedResults.length === 0) {
            recentQuizzesSection.style.display = 'none';
            return;
        }

        recentQuizzesSection.style.display = 'block';

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const todayQuizzes = storedResults.filter(r => r.date.startsWith(today));
        const yesterdayQuizzes = storedResults.filter(r => r.date.startsWith(yesterday) && !r.date.startsWith(today));
        const olderQuizzes = storedResults.filter(r => !r.date.startsWith(today) && !r.date.startsWith(yesterday));

        const createSection = (title, quizzes) => {
            if (quizzes.length === 0) return;
            const sectionHtml = `
                <h4>${title}</h4>
                <ul id="recent-${title.toLowerCase().replace(' ', '-')}-list" class="scores-list">
                    ${quizzes.map(q => `
                        <li>
                            <span><strong>${q.friendName}</strong> scored <strong>${q.score} / ${q.totalQuestions}</strong> on <strong>${q.creatorName}'s</strong> quiz.</span>
                            <a href="?id=${q.quizId}&view=scoreboard" class="btn small-btn secondary-btn">View Scoreboard</a>
                        </li>
                    `).join('')}
                </ul>
            `;
            container.innerHTML += sectionHtml;
        };

        createSection("Today", todayQuizzes);
        createSection("Yesterday", yesterdayQuizzes);
        createSection("Older", olderQuizzes);
    }

    // Creator dashboard
    function loadCreatorDashboard(quizzes) {
        if (quizzes.length === 0) {
            creatorQuizzesList.innerHTML = `<p>You haven't created any quizzes yet.</p>`;
            return;
        }

        creatorQuizzesList.innerHTML = `<ul></ul>`;
        const quizListEl = creatorQuizzesList.querySelector('ul');

        quizzes.forEach(quiz => {
            const li = document.createElement('li');
            const quizTitle = `${quiz.creatorName}'s Quiz (${quiz.quizId})`;
            li.innerHTML = `
                <div>
                    <h3>${quizTitle}</h3>
                    <p id="takers-count-${quiz.quizId}">Loading takers...</p>
                </div>
                <a href="?id=${quiz.quizId}&view=scoreboard" class="btn small-btn secondary-btn">View Results</a>
            `;
            quizListEl.appendChild(li);

            // Fetch the number of takers from Firebase
            database.ref(`quizzes/${quiz.quizId}/scores`).once('value').then(snapshot => {
                const scores = snapshot.val();
                const takersCount = scores ? Object.keys(scores).length : 0;
                document.getElementById(`takers-count-${quiz.quizId}`).innerText = `${takersCount} Taker${takersCount !== 1 ? 's' : ''}`;
            });
        });
    }

    // === Creator Flow ===
    document.getElementById('create-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const creatorName = creatorNameInput.value.trim();
        if (!creatorName) return;

        currentQuizQuestions = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, 15);
        creatorAnswers = Array(currentQuizQuestions.length).fill(null);

        showView(quizSection);
        renderQuestion(currentQuizQuestions, creatorAnswers);
        currentQuestionIndex = 0;
        prevBtn.style.display = 'none';
        nextBtn.style.display = currentQuizQuestions.length > 1 ? 'block' : 'none';
        submitBtn.style.display = currentQuizQuestions.length === 1 ? 'block' : 'none';
    });

    // === Quiz Taker Flow ===
    document.getElementById('take-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const takerName = takerNameInput.value.trim();
        if (!takerName) return;

        database.ref(`quizzes/${quizId}`).once('value').then(snapshot => {
            const quizData = snapshot.val();
            if (quizData) {
                currentQuizQuestions = quizData.questions || [];
                takerAnswers = Array(currentQuizQuestions.length).fill(null);
                showView(quizSection);
                renderQuestion(currentQuizQuestions, takerAnswers);
                document.getElementById('quiz-heading').innerText = `${quizData.creatorName}'s Quiz`;

                currentQuestionIndex = 0;
                prevBtn.style.display = 'none';
                nextBtn.style.display = currentQuizQuestions.length > 1 ? 'block' : 'none';
                submitBtn.style.display = currentQuizQuestions.length === 1 ? 'block' : 'none';
            } else {
                alert("Quiz not found!");
                window.location.href = 'index.html';
            }
        });
    });

    // === Quiz Navigation (both roles) ===
    nextBtn.addEventListener('click', () => {
        const selected = document.querySelector('.quiz-option.selected');
        if (!selected) {
            alert("Please select an answer.");
            return;
        }

        const answersArray = quizId ? takerAnswers : creatorAnswers;
        answersArray[currentQuestionIndex] = selected.dataset.value;

        if (currentQuestionIndex < currentQuizQuestions.length - 1) {
            currentQuestionIndex++;
            renderQuestion(currentQuizQuestions, answersArray);
        }

        prevBtn.style.display = currentQuestionIndex > 0 ? 'block' : 'none';
        nextBtn.style.display = currentQuestionIndex < currentQuizQuestions.length - 1 ? 'block' : 'none';
        submitBtn.style.display = currentQuestionIndex === currentQuizQuestions.length - 1 ? 'block' : 'none';
    });

    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            const answersArray = quizId ? takerAnswers : creatorAnswers;
            renderQuestion(currentQuizQuestions, answersArray);
        }
        prevBtn.style.display = currentQuestionIndex > 0 ? 'block' : 'none';
        nextBtn.style.display = currentQuizQuestions.length > 1 && currentQuestionIndex < currentQuizQuestions.length - 1 ? 'block' : 'none';
        submitBtn.style.display = currentQuestionIndex === currentQuizQuestions.length - 1 ? 'block' : 'none';
    });

    // === Submit (both roles) ===
    submitBtn.addEventListener('click', () => {
        const selected = document.querySelector('.quiz-option.selected');
        if (!selected) {
            alert("Please select an answer.");
            return;
        }

        const answersArray = quizId ? takerAnswers : creatorAnswers;
        answersArray[currentQuestionIndex] = selected.dataset.value;

        if (quizId) {
            // Taker submits -> score and persist taker result for return visits
            database.ref(`quizzes/${quizId}`).once('value').then(snapshot => {
                const quizData = snapshot.val();
                let score = 0;
                answersArray.forEach((answer, index) => {
                    if (answer === quizData.questions[index].correctAnswer) {
                        score++;
                    }
                });

                database.ref(`quizzes/${quizId}/scores`).push({
                    friendName: takerNameInput.value.trim(),
                    score: score,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                }).then(() => {
                    // Save to local recent results
                    const quizResult = {
                        quizId: quizId,
                        creatorName: quizData.creatorName,
                        friendName: takerNameInput.value.trim(),
                        score: score,
                        totalQuestions: currentQuizQuestions.length,
                        date: new Date().toISOString()
                    };
                    const storedResults = JSON.parse(localStorage.getItem('buddyzResults')) || [];
                    storedResults.unshift(quizResult);
                    localStorage.setItem('buddyzResults', JSON.stringify(storedResults));

                    // Persist the taker's final result (so refresh/return shows result, not landing)
                    const finalScoreData = {
                        role: 'taker',
                        quizId,
                        creatorName: quizData.creatorName,
                        friendName: takerNameInput.value.trim(),
                        score: score,
                        totalQuestions: currentQuizQuestions.length,
                        timestamp: new Date().toISOString()
                    };
                    localStorage.setItem('finalQuizResult', JSON.stringify(finalScoreData));

                    // Show result immediately
                    showView(resultSection);
                    document.getElementById('final-score').innerText = `${score} / ${currentQuizQuestions.length}`;
                    const p = resultSection.querySelector('p');
                    if (p) {
                        p.innerHTML = `Thanks for playing, ${finalScoreData.friendName}! This was <strong>${finalScoreData.creatorName}</strong>'s quiz. <a href="?id=${quizId}&view=scoreboard">View the live scoreboard</a>.`;
                    }
                });
            });
        } else {
            // Creator submits -> seal answers, save quiz, show share + live scoreboard preview
            currentQuizQuestions.forEach((question, index) => {
                question.correctAnswer = creatorAnswers[index];
            });

            const newQuizId = generateQuizID();
            const creatorName = creatorNameInput.value.trim();
            database.ref(`quizzes/${newQuizId}`).set({
                creatorName: creatorName,
                questions: currentQuizQuestions,
                scores: {}
            }).then(() => {
                // Save to creator's dashboard list
                const storedQuizzes = JSON.parse(localStorage.getItem('myCreatedQuizzes'));
let myQuizzes;

if (Array.isArray(storedQuizzes)) {
    // If the stored data is a valid array, use it
    myQuizzes = storedQuizzes;
} else {
    // Otherwise, initialize a new, empty array
    myQuizzes = [];
}

myQuizzes.unshift({
    quizId: newQuizId,
    creatorName: creatorName
});

localStorage.setItem('myCreatedQuizzes', JSON.stringify(myQuizzes));


                // Remember the latest created quiz for auto-return
                localStorage.setItem('lastCreatedQuiz', JSON.stringify({ quizId: newQuizId, creatorName }));

                // Show Share screen with link & scoreboard CTA
                showView(shareSection);
                const quizLink = `${window.location.href.split('?')[0]}?id=${newQuizId}`;
                document.getElementById('share-link').value = quizLink;
                document.getElementById('view-results-link').href = `?id=${newQuizId}&view=scoreboard`;

                // Live mini-scoreboard under the share box
                loadScorePreview(newQuizId);
            });
        }
    });

    // === Dashboard buttons ===
    goToDashboardBtn.addEventListener('click', () => {
        showView(creatorDashboard);
        const creatorQuizzes = JSON.parse(localStorage.getItem('myCreatedQuizzes')) || [];
        loadCreatorDashboard(creatorQuizzes);
    });

    createNewQuizBtn.addEventListener('click', () => {
        showView(creatorSection);
        loadRecentQuizzes();
    });

    // === Scoreboard (full page) ===
    function loadScoreboard(id) {
        database.ref(`quizzes/${id}`).once('value').then(snapshot => {
            const quizData = snapshot.val();
            if (quizData) {
                document.getElementById('scoreboard-heading').innerText = `${quizData.creatorName}'s Quiz Scores`;
                document.getElementById('scoreboard-subheading').innerText = `Total Questions: ${quizData.questions.length}`;
                const scoresList = document.getElementById('scores-list');
                scoresList.innerHTML = '';
                const scores = quizData.scores ? Object.values(quizData.scores) : [];
                scores.sort((a, b) => (b.score || 0) - (a.score || 0));
                scores.forEach(score => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${score.friendName || 'Anonymous'}</strong><span>${score.score} / ${quizData.questions.length}</span>`;
                    scoresList.appendChild(li);
                });

                if (scores.length === 0) {
                    // Show empty state (no redirect so people don't lose context)
                    const li = document.createElement('li');
                    li.innerHTML = `<em>No scores yet. Share your link to get the first taker!</em>`;
                    scoresList.appendChild(li);
                }
            } else {
                alert("Quiz not found!");
                window.location.href = 'index.html';
            }
        });
    }

    // === Share screen: Live mini-scoreboard ===
    function loadScorePreview(id) {
        let container = document.getElementById('share-scoreboard-preview');
        if (!container) {
            container = document.createElement('div');
            container.id = 'share-scoreboard-preview';
            container.style.marginTop = '16px';
            container.innerHTML = `
                <h3 style="margin-bottom:8px;">Live Scoreboard</h3>
                <div id="share-scoreboard-list">Loading...</div>
            `;
            shareSection.appendChild(container);
        }
        const listEl = container.querySelector('#share-scoreboard-list');

        // We want the total question count for "/total"
        database.ref(`quizzes/${id}`).once('value').then(snap => {
            const data = snap.val() || {};
            const total = data.questions ? data.questions.length : 0;

            database.ref(`quizzes/${id}/scores`).on('value', (snapshot) => {
                const scores = snapshot.val();
                if (!scores) {
                    listEl.innerHTML = '<p>No scores yet.</p>';
                    return;
                }
                const arr = Object.values(scores).sort((a, b) => (b.score || 0) - (a.score || 0));
                const top = arr.slice(0, 5);
                listEl.innerHTML = '<ol style="padding-left:18px;margin:0;">' + top.map(s =>
                    `<li>${(s.friendName || 'Anonymous')} — ${s.score}${total ? `/${total}` : ''}</li>`
                ).join('') + '</ol>';
            });
        });
    }

    // === Copy Link ===
    document.querySelector('.copy-btn').addEventListener('click', () => {
        const linkInput = document.getElementById('share-link');
        linkInput.select();
        document.execCommand('copy');
        alert("Link copied to clipboard!");
    });
});