(function () {
    // Default configurations
    const defaultConfig = {
        bubbleColor: '#007BFF',
        bubbleTextColor: '#FFFFFF',
        bubbleSize: '60px',
        popupBackgroundColor: '#FFFFFF',
        popupBorderColor: '#ddd',
        popupTextColor: '#000000',
        reviewHeaderText: 'Customer Reviews',
        noReviewsText: 'No reviews available.',
        submitButtonText: 'Submit Review',
        position: {
            bottom: '20px',
            right: '20px'
        }
    };

    // Configuration provided by the user
    const userConfig = window.reviewWidgetConfig || {};

    // Merge user configuration with default configuration
    const config = { ...defaultConfig, ...userConfig };

    // Create style element for CSS
    const style = document.createElement('style');
    style.textContent = `
        #review-widget {
            font-family: Arial, sans-serif;
        }

        #review-widget #review-bubble {
            position: fixed;
            bottom: ${config.position.bottom};
            right: ${config.position.right};
            background-color: ${config.bubbleColor};
            color: ${config.bubbleTextColor};
            border-radius: 50%;
            width: ${config.bubbleSize};
            height: ${config.bubbleSize};
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            z-index: 1000;
        }

        #review-widget #review-popup {
            display: none; /* Hidden by default */
            position: fixed;
            bottom: calc(${config.position.bottom} + ${config.bubbleSize});
            right: ${config.position.right};
            width: 300px;
            background-color: ${config.popupBackgroundColor};
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            padding: 20px;
            z-index: 1000;
            border: 1px solid ${config.popupBorderColor};
        }

        #review-widget #review-popup h3 {
            margin: 0;
            margin-bottom: 10px;
            font-size: 18px;
            color: ${config.popupTextColor};
        }

        #review-widget #review-list {
            max-height: 150px;
            overflow-y: auto;
            margin-bottom: 10px;
            border-bottom: 1px solid ${config.popupBorderColor};
            padding-bottom: 10px;
        }

        #review-widget input,
        #review-widget textarea {
            width: 100%;
            margin-bottom: 10px;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }

        #review-widget button {
            width: 100%;
            padding: 10px;
            background-color: ${config.bubbleColor};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        #review-widget button:hover {
            background-color: #0056b3;
        }
    `;
    document.head.appendChild(style);

    // Create the review widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'review-widget';
    document.body.appendChild(widgetContainer);

    // Create the review bubble
    const bubble = document.createElement('div');
    bubble.id = 'review-bubble';
    bubble.innerHTML = '💬';
    widgetContainer.appendChild(bubble);

    // Create the review popup
    const popup = document.createElement('div');
    popup.id = 'review-popup';
    popup.innerHTML = `
        <h3>${config.reviewHeaderText}</h3>
        <div id="review-list"></div>
        <form id="review-form" no-validate>
            <input type="text" id="name" placeholder="Your name" required>
            <input type="email" id="email" placeholder="Your email" required>
            <textarea id="review" rows="4" placeholder="Write your review..." required></textarea>
            <button type="submit">${config.submitButtonText}</button>
        </form>
    `;
    widgetContainer.appendChild(popup);

    // Function to toggle the visibility of the review popup
    bubble.addEventListener('click', () => {
        popup.style.display = (popup.style.display === 'none' || popup.style.display === '') ? 'block' : 'none';
    });

    // Function to fetch five random reviews from the backend without authentication
    function fetchRandomReviews(site) {
        fetch(`https://customer-review-tracking-application-be.onrender.com/random-reviews?site=${encodeURIComponent(site)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(reviews => {
                displayReviews(reviews);
            })
            .catch(err => console.error('Error fetching random reviews:', err));
    }

    // Function to display fetched reviews
    function displayReviews(reviews) {
        const reviewList = document.getElementById('review-list');
        reviewList.innerHTML = '';

        if (reviews.length === 0) {
            reviewList.innerHTML = `<p style="color: ${config.popupTextColor};">${config.noReviewsText}</p>`;

            return;
        }

        reviews.forEach(({ name, review }) => {
            const reviewElement = document.createElement('div');
            reviewElement.innerHTML = `<strong>${name}:</strong> ${review}`;
            reviewList.appendChild(reviewElement);
        });
    }

    // Get the current site dynamically
    const site = window.location.hostname;

    // Fetch five random reviews for the current site
    fetchRandomReviews(site);

    // Handle form submission
    const reviewForm = document.getElementById('review-form');
    reviewForm.onsubmit = (e) => {
        e.preventDefault(); // Prevent form from refreshing the page

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const review = document.getElementById('review').value;

        const newReview = {
            name,
            email,
            review,
            site // Use the current site for the review
        };

        // Send the new review to the backend (requires authentication)
        const token = localStorage.getItem('token'); // Get token from local storage
        fetch('https://customer-review-tracking-application-be.onrender.com/submit-review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Include the token in the headers
            },
            body: JSON.stringify(newReview)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Review submitted successfully:', data);
                
                // Add the new review to the list
                const reviewList = document.getElementById('review-list');
                const newReviewElement = document.createElement('div');
                newReviewElement.innerHTML = `<strong>${name}:</strong> ${review}`;
                reviewList.appendChild(newReviewElement);
                
                // Clear the form
                reviewForm.reset();
            })
            .catch(err => console.error('Error submitting review:', err));
    };
})();
