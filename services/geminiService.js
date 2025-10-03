
const { GoogleGenAI, Modality } = require("@google/genai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const imageEditModel = 'gemini-2.5-flash-image';

const processApiResponse = (response) => {
    if (response.promptFeedback?.blockReason) {
        console.error('Request was blocked by API:', response.promptFeedback);
        throw new Error(`Image processing was blocked for safety reasons: ${response.promptFeedback.blockReason}. Please try another image.`);
    }

    const candidate = response.candidates?.[0];
    if (!candidate) {
         throw new Error('The AI did not return a response. Please try again or use a different image.');
    }

    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        let reasonText = '';
        switch(candidate.finishReason) {
            case 'MAX_TOKENS': reasonText = 'The response was too long.'; break;
            case 'SAFETY': reasonText = 'The response was blocked for safety reasons.'; break;
            case 'RECITATION': reasonText = 'The response contained too much cited material.'; break;
            default: reasonText = `Processing was interrupted (${candidate.finishReason}).`;
        }
         throw new Error(`The AI could not process the image. Reason: ${reasonText} Please try another image.`);
    }

    if (!candidate.content?.parts || candidate.content.parts.length === 0) {
         throw new Error('The AI returned an empty response. Please try again or use a different image.');
    }
    
    const imagePart = candidate.content.parts.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) {
        return imagePart.inlineData.data;
    }
    
    const textPart = candidate.content.parts.find(part => part.text);
    if (textPart?.text) {
        const cleanedText = textPart.text.replace(/```/g, '').trim();
        if (cleanedText) {
            console.warn('Gemini API returned text instead of an image:', cleanedText);
            throw new Error(`The AI could not process the image. Reason: ${cleanedText}. Please try another image.`);
        }
    }
    
    throw new Error('The AI did not return an image and provided no explanation. Please try another image or try again later.');
};

const generateFacadeImages = async (
    facadeBase64, 
    mimeType,
    modernizationChoices,
    facadeColor,
    railingMaterial,
    balconyBase64 = null,
    balconyMimeType = null
) => {
    try {
        const facadeImageInputPart = {
            inlineData: { data: facadeBase64, mimeType: mimeType },
        };
        
        const glazingPromptPart = { text: "Tehtäväsi on TÄYSIN ja AINOASTAAN lisätä valokuvarealistiset, modernit ja kehyksettömät lasitukset jokaiseen kuvan parvekkeeseen. KRIITTINEN SÄÄNTÖ: Älä muuta rakennuksen alkuperäistä arkkitehtuuria, rakennetta, muotoa tai mitään yksityiskohtia millään tavalla. Parvekkeiden määrä, sijainti ja muoto on säilytettävä 100% muuttumattomana. ÄLÄ lisää, poista tai siirrä yhtäkään parveketta. ÄLÄ muokkaa mitään muuta osaa kuvasta. Kaiteiden, seinien, ikkunoiden ja ympäristön on pysyttävä TÄSMÄLLEEN alkuperäisinä. Ainoa sallittu muutos on parvekelasien lisääminen olemassa oleviin parvekkeisiin. Palauta vain muokattu kuva." };
        
        const modernizationPromptParts = [
            'KRIITTINEN OHJE: On ehdottoman välttämätöntä, että kaikki alla mainitut muutokset toteutetaan johdonmukaisesti ja kattavasti KOKO näkyvissä olevaan julkisivuun. Yksikään osa rakennuksesta ei saa jäädä alkuperäiseen tilaansa. Jos muutat elementin (esim. parvekekaide, ikkunanpuite), muuta se KAIKISSA vastaavissa paikoissa.',
            'Modernisoi tämä rakennuksen julkisivu. Lisää jokaiseen parvekkeeseen valokuvarealistiset, modernit ja kehyksettömät lasitukset.',
            'Rakennuksen perusrakenne, mukaan lukien kaikkien ikkunoiden ja parvekkeiden sijainti ja lukumäärä, on säilytettävä täysin muuttumattomana. Älä poista olemassa olevia ikkunoita tai parvekkeita, äläkä lisää uusia.'
        ];

        if (modernizationChoices.includes('facade')) {
            const colorMap = {
                'vaaleanharmaa': 'vaaleanharmaaksi',
                'valkoinen': 'puhtaanvalkoiseksi',
                'beige': 'lämpimän beigeksi',
                'tiilenpunainen': 'modernin tiilenpunaiseksi',
                'tummanharmaa': 'tummanharmaaksi',
            };
            const colorInstruction = colorMap[facadeColor] || 'modernin sävyiseksi';
            modernizationPromptParts.push(`Muuta KOKO julkisivun pääväri ${colorInstruction}. Varmista, että väritys on TÄYSIN tasainen ja kattaa poikkeuksetta kaikki seinäpinnat, mukaan lukien parvekkeiden taustaseinät.`);
        }
        
        if (modernizationChoices.includes('railings')) {
             const materialMap = {
                'lasi-metalli': 'kirkasta lasia ja siroja, tummia metallirakenteita',
                'puusaleet': 'tyylikkäitä pystysuoria puusäleitä',
                'tumma-metalli': 'ohueita, pystysuoria tummia metallipintoja (pinnakaide)',
            };
            const materialInstruction = materialMap[railingMaterial] || 'moderneja materiaaleja';
            modernizationPromptParts.push(`Vaihda poikkeuksetta KAIKKI olemassaolevat parvekekaiteet uusiin, jotka on tehty materiaalista ${materialInstruction}. Muutoksen on oltava täysin yhtenäinen KOKO rakennuksessa.`);
        }

        modernizationPromptParts.push('Luo yhtenäinen ja moderni ilme. Varmista, että lopputulos on valokuvarealistinen. Palauta vain muokattu kuva ilman mitään tekstiä.');
        
        const modernizationPrompt = modernizationPromptParts.join(' ');
        const modernizationPromptPart = { text: modernizationPrompt };

        const config = { responseModalities: [Modality.IMAGE, Modality.TEXT] };
        
        const glazingPromise = ai.models.generateContent({ model: imageEditModel, contents: { parts: [facadeImageInputPart, glazingPromptPart] }, config });
        const modernizationPromise = ai.models.generateContent({ model: imageEditModel, contents: { parts: [facadeImageInputPart, modernizationPromptPart] }, config });
        
        let cozyPromise = null;
        if (balconyBase64 && balconyMimeType) {
            const balconyImageInputPart = { inlineData: { data: balconyBase64, mimeType: balconyMimeType } };
            const cozyPromptParts = [
                "Tehtäväsi on luoda tunnelmallinen ja paranneltu versio tästä parvekekuvasta.",
                "Lisää kuvaan modernit, kehyksettömät parvekelasit, jos niitä ei vielä ole tai ne ovat vanhanaikaiset."
            ];
            if (modernizationChoices.includes('railings')) {
                 const materialMap = {
                    'lasi-metalli': 'kirkasta lasia ja siroja, tummia metallirakenteita',
                    'puusaleet': 'tyylikkäitä pystysuoria puusäleitä',
                    'tumma-metalli': 'ohueita, pystysuoria tummia metallipintoja (pinnakaide)',
                };
                const materialInstruction = materialMap[railingMaterial] || 'moderneja materiaaleja';
                cozyPromptParts.push(`Erityisen tärkeää: Korvaa alkuperäisen kuvan parvekekaide kokonaan uudella kaiteella, joka on tehty materiaalista ${materialInstruction}.`);
            }
            cozyPromptParts.push(
                "Sisusta parveke modernisti ja kutsuvasti pienellä pöydällä, tuolilla ja kasveilla.",
                "Muuta valaistus pimeäksi illaksi ja lisää parvekkeelle palavia kynttilöitä ja lämpimiä valoja luomaan erittäin kotoisa tunnelma.",
                "Varmista, että lopputulos on valokuvarealistinen ja näyttää alkuperäisen kuvan parannellulta versiolta.",
                "Palauta vain muokattu kuva ilman mitään tekstiä."
            );
            const cozyPrompt = cozyPromptParts.join(' ');
            const cozyPromptPart = { text: cozyPrompt };
            cozyPromise = ai.models.generateContent({ model: imageEditModel, contents: { parts: [balconyImageInputPart, cozyPromptPart] }, config });
        }

        const [glazingResponse, modernizationResponse] = await Promise.all([glazingPromise, modernizationPromise]);
        const glazedImage = processApiResponse(glazingResponse);
        const modernizedImage = processApiResponse(modernizationResponse);
        
        let cozyBalconyImage = null;
        if (cozyPromise) {
            const cozyGenResponse = await cozyPromise;
            cozyBalconyImage = processApiResponse(cozyGenResponse);
        }

        return { glazedImage, modernizedImage, cozyBalconyImage };

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
};

module.exports = { generateFacadeImages };
