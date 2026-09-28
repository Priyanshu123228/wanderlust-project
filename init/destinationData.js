const sampleDestinations = [
    {
        name: "Manali",
        tagline: "The Valley of Gods & Himalayan Adventure Haven",
        description: "Nestled in the breathtaking Pir Panjal and Dhauladhar ranges, Manali is India's premier mountain paradise. Famous for snow-draped peaks, pine forests, lush valleys, Solang Valley adventure sports, and sacred temples.",
        location: "Himachal Pradesh",
        country: "India",
        image: {
            filename: "destination_manali",
            url: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80"
        },
        geometry: {
            type: "Point",
            coordinates: [77.1892, 32.2432]
        },
        bestTimeToVisit: "October to June",
        climate: "Alpine & Snow (Winters)",
        estimatedBudget: {
            low: 1500,
            medium: 3500,
            high: 8000
        },
        popularInterests: ["Adventure", "Nature", "Food", "Relaxation"],
        featured: true
    },
    {
        name: "Goa",
        tagline: "Sun-Kissed Beaches, Portuguese Charm & Coastal Life",
        description: "Goa offers a captivating mix of golden sandy coastlines, lively beach shacks, Portuguese colonial architecture, water sports, and vibrant seafood cuisine. Perfect for relaxation and celebration alike.",
        location: "Goa",
        country: "India",
        image: {
            filename: "destination_goa",
            url: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80"
        },
        geometry: {
            type: "Point",
            coordinates: [73.8180, 15.2993]
        },
        bestTimeToVisit: "November to March",
        climate: "Tropical & Coastal",
        estimatedBudget: {
            low: 2000,
            medium: 4500,
            high: 10000
        },
        popularInterests: ["Beach", "Food", "Nightlife", "Relaxation", "Adventure"],
        featured: true
    },
    {
        name: "Jaipur",
        tagline: "The Pink City of Maharajas, Forts & Royal Palaces",
        description: "The capital of Rajasthan, Jaipur mesmerizes travelers with imposing hill forts, intricate pink sandstone palaces, lively bazaars filled with handicrafts, and sumptuous royal Rajasthani thalis.",
        location: "Rajasthan",
        country: "India",
        image: {
            filename: "destination_jaipur",
            url: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80"
        },
        geometry: {
            type: "Point",
            coordinates: [75.7873, 26.9124]
        },
        bestTimeToVisit: "October to March",
        climate: "Semi-Arid & Pleasant Winters",
        estimatedBudget: {
            low: 1600,
            medium: 3800,
            high: 8500
        },
        popularInterests: ["Historical", "Culture", "Shopping", "Food"],
        featured: true
    },
    {
        name: "Shimla",
        tagline: "The Queen of Hills & British Colonial Splendor",
        description: "Perched along scenic Himalayan ridges, Shimla charms with its historic Mall Road, toy train railway, neo-Gothic church architecture, and snow-laden panoramas.",
        location: "Himachal Pradesh",
        country: "India",
        image: {
            filename: "destination_shimla",
            url: "https://images.unsplash.com/photo-1562670652-e5947bddb335?auto=format&fit=crop&w=1200&q=80"
        },
        geometry: {
            type: "Point",
            coordinates: [77.1734, 31.1048]
        },
        bestTimeToVisit: "March to June & Dec-Jan (Snow)",
        climate: "Subtropical Highland",
        estimatedBudget: {
            low: 1700,
            medium: 3600,
            high: 7800
        },
        popularInterests: ["Nature", "Historical", "Relaxation", "Shopping"],
        featured: false
    },
    {
        name: "Delhi",
        tagline: "The Historic Capital of Monuments, Cultures & Street Food",
        description: "Delhi bridges ancient empires and hyper-modern living. Home to UNESCO World Heritage monuments like Qutub Minar and Red Fort, bustling Chandni Chowk food lanes, and sprawling leafy boulevards.",
        location: "Delhi NCR",
        country: "India",
        image: {
            filename: "destination_delhi",
            url: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80"
        },
        geometry: {
            type: "Point",
            coordinates: [77.2090, 28.6139]
        },
        bestTimeToVisit: "October to March",
        climate: "Continental / Warm Winters",
        estimatedBudget: {
            low: 1400,
            medium: 3200,
            high: 7500
        },
        popularInterests: ["Historical", "Food", "Culture", "Shopping"],
        featured: true
    },
    {
        name: "Mumbai",
        tagline: "The City of Dreams, Coastal Skylines & Gateway of India",
        description: "India's financial powerhouse and home to Bollywood. Mumbai boasts Art Deco architecture, the Arabian Sea promenade of Marine Drive, vibrant street food, and historic caves on Elephanta Island.",
        location: "Maharashtra",
        country: "India",
        image: {
            filename: "destination_mumbai",
            url: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1200&q=80"
        },
        geometry: {
            type: "Point",
            coordinates: [72.8777, 19.0760]
        },
        bestTimeToVisit: "November to February",
        climate: "Tropical & Breezy",
        estimatedBudget: {
            low: 1800,
            medium: 4200,
            high: 9500
        },
        popularInterests: ["Culture", "Food", "Nightlife", "Shopping", "Historical"],
        featured: false
    },
    {
        name: "Udaipur",
        tagline: "The Romantic City of Pristine Lakes & Marble Palaces",
        description: "Known as the Venice of the East, Udaipur is renowned for Lake Pichola, towering royal palaces, romantic boat rides, and sunsets over the Aravalli hills.",
        location: "Rajasthan",
        country: "India",
        image: {
            filename: "destination_udaipur",
            url: "https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=1200&q=80"
        },
        geometry: {
            type: "Point",
            coordinates: [73.7125, 24.5854]
        },
        bestTimeToVisit: "September to March",
        climate: "Pleasant & Sunny",
        estimatedBudget: {
            low: 1800,
            medium: 4000,
            high: 9000
        },
        popularInterests: ["Historical", "Culture", "Relaxation", "Food"],
        featured: true
    },
    {
        name: "Rishikesh",
        tagline: "The Yoga Capital of the World & Ganga River Adventure",
        description: "Where the sacred Ganges emerges from the Himalayas. Rishikesh is a global sanctuary for yoga, meditation, river rafting, bungee jumping, and evening Ganga Aarti ceremonies.",
        location: "Uttarakhand",
        country: "India",
        image: {
            filename: "destination_rishikesh",
            url: "https://images.unsplash.com/photo-1600100397608-f010f443b7e7?auto=format&fit=crop&w=1200&q=80"
        },
        geometry: {
            type: "Point",
            coordinates: [78.2676, 30.0869]
        },
        bestTimeToVisit: "September to May",
        climate: "Temperate & Mountainous",
        estimatedBudget: {
            low: 1300,
            medium: 3000,
            high: 6500
        },
        popularInterests: ["Adventure", "Nature", "Relaxation", "Culture"],
        featured: false
    }
];

module.exports = { data: sampleDestinations };
