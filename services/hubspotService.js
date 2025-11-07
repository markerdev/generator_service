const HUBSPOT_PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;
const HUBSPOT_FORM_GUID = process.env.HUBSPOT_FORM_GUID;

/**
 * Submits form data to the HubSpot Forms API.
 * @param {object} userData - The user data from the form.
 * @param {string} userData.firstName
 * @param {string} userData.lastName
 * @param {string} userData.email
 * @param {string} userData.phoneNumber
 * @param {string} userData.housingCompany
 */
async function submitToHubSpot(userData) {
    if (!HUBSPOT_PORTAL_ID || !HUBSPOT_FORM_GUID) {
        console.warn('HubSpot environment variables (PORTAL_ID, FORM_GUID) are not set. Skipping submission.');
        return;
    }

    const hubspotApiUrl = `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_GUID}`;

    // Map our form data to HubSpot's internal property names.
    const hubspotPayload = {
        fields: [
            { name: 'firstname', value: userData.firstName },
            { name: 'lastname', value: userData.lastName },
            { name: 'email', value: userData.email },
            { name: 'phone', value: userData.phoneNumber },
            { name: 'company', value: userData.housingCompany } // HubSpot's default property for company name is 'company'.
        ],
        context: {
            pageUri: "https://ai-glazing-generator.com", // You can replace this with your actual app URL
            pageName: "AI Balcony Glazing Generator"
        }
    };

    try {
        console.log(`Submitting data for ${userData.email} to HubSpot...`);
        const response = await fetch(hubspotApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(hubspotPayload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HubSpot API responded with status ${response.status}: ${errorBody}`);
        }
        
        console.log(`Successfully submitted data for ${userData.email} to HubSpot.`);
        // The response for a successful submission is typically a 204 No Content,
        // but we'll log whatever we get for debugging purposes.
        const responseData = await response.json().catch(() => null); // Handle cases with no JSON body
        console.log('HubSpot response:', responseData);

    } catch (error) {
        console.error('Failed to submit data to HubSpot:', error.message);
        // We re-throw the error so the calling function's .catch() can handle it if needed.
        throw error;
    }
}

module.exports = { submitToHubSpot };