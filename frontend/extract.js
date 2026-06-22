const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, 'services');

const mapping = [
    { file: 'plumber.html', title: 'Plumber Services', id: 'plumber' },
    { file: 'electrician.html', title: 'Electrician Services', id: 'electrician' },
    { file: 'ac-repairing.html', title: 'AC Repair & Services', id: 'ac-repair' },
    { file: 'salon.html', title: 'Salon Services', id: 'salon' },
    { file: 'car-cleaner.html', title: 'Car Cleaner Services', id: 'car-cleaner' },
    { file: 'tutor.html', title: 'Tutor Services', id: 'tutor' }
];

let allServices = [];

mapping.forEach(m => {
    const html = fs.readFileSync(path.join(servicesDir, m.file), 'utf-8');
    
    // Look for <div class="service-card" ...> or similar
    // We can extract simply by matching image, h3, p, and some price
    const regex = /<img\s+src=["']([^"']+)["'][^>]*>\s*<h3[^>]*>([^<]+)<\/h3>\s*<p[^>]*>([^<]+)<\/p>\s*<(?:span|div)[^>]*>([^<]+)<\/(?:span|div)>/g;
    
    let match;
    const categoryServices = [];
    while ((match = regex.exec(html)) !== null) {
        let priceText = match[4].trim();
        let numericPrice = parseInt(priceText.replace(/\D/g, '')) || 0;
        
        categoryServices.push({
            title: match[2].trim(),
            image: match[1].trim(),
            description: match[3].trim(),
            price: numericPrice,
            priceText: priceText
        });
    }
    
    allServices.push({
        categoryId: m.id,
        categoryTitle: m.title,
        services: categoryServices
    });
});

const output = `const servicesData = ${JSON.stringify(allServices, null, 2)};`;
fs.writeFileSync(path.join(__dirname, 'js/services-data.js'), output);
console.log('Successfully extracted', allServices.length, 'categories');
