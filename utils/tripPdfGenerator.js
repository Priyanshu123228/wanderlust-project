const PDFDocument = require("pdfkit");

/**
 * Utility to sanitize filename strings
 */
function sanitizeFilename(str) {
    if (!str) return "Trip";
    return str
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
}

/**
 * Format currency safely for standard PDFKit fonts (Rs. / INR)
 */
function formatCurrency(amount) {
    const num = Number(amount) || 0;
    return `Rs. ${num.toLocaleString("en-IN")}`;
}

/**
 * Generates a complete, multi-page professional PDF document for a Wanderlust itinerary.
 * @param {Object} itinerary - Complete populated Itinerary document
 * @returns {Promise<Buffer>} - Resolved PDF buffer
 */
function generateItineraryPdf(itinerary) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                margins: { top: 40, bottom: 45, left: 40, right: 40 },
                bufferPages: true,
                info: {
                    Title: itinerary.title || "Wanderlust Travel Itinerary",
                    Author: "Wanderlust Travel Platform",
                    Subject: `Trip Plan for ${itinerary.destinationName || "Destination"}`,
                    Keywords: "Travel, Itinerary, Vacation, Wanderlust"
                }
            });

            const buffers = [];
            doc.on("data", chunk => buffers.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(buffers)));
            doc.on("error", err => reject(err));

            const primaryColor = "#FE424D"; // Wanderlust Red
            const darkColor = "#1E293B";    // Slate Dark
            const grayColor = "#64748B";    // Slate Muted Gray
            const lightBg = "#F8FAFC";      // Subtle card background
            const borderColor = "#E2E8F0";  // Light border
            const morningColor = "#D97706"; // Amber
            const lunchColor = "#B45309";   // Warm Orange
            const afternoonColor = "#7C3AED";// Purple
            const eveningColor = "#DC2626"; // Rose/Red
            const dinnerColor = "#1F2937";  // Dark Navy
            const stayColor = "#059669";    // Emerald Green

            const contentWidth = doc.page.width - 80; // 595.28 - 80 = 515.28

            // -------------------------------------------------------------
            // Helper: Ensure Space on Page or Add New Page
            // -------------------------------------------------------------
            function ensureSpace(heightNeeded) {
                if (doc.y + heightNeeded > doc.page.height - doc.page.margins.bottom) {
                    doc.addPage();
                    drawPageHeaderSmall();
                }
            }

            function drawPageHeaderSmall() {
                doc.save();
                doc.fontSize(8).fillColor(grayColor).text("WANDERLUST TRAVEL ITINERARY", 40, 20, { align: "left" });
                doc.fontSize(8).fillColor(primaryColor).text(itinerary.title || "Trip Plan", 40, 20, { align: "right" });
                doc.strokeColor(borderColor).lineWidth(0.5).moveTo(40, 32).lineTo(40 + contentWidth, 32).stroke();
                doc.restore();
                doc.y = 45;
            }

            // =============================================================
            // 1. TOP HEADER & BRANDING
            // =============================================================
            // Header accent bar
            doc.rect(40, 35, 6, 44).fill(primaryColor);

            doc.fontSize(22).font("Helvetica-Bold").fillColor(darkColor).text("WANDERLUST", 54, 37);
            doc.fontSize(9).font("Helvetica").fillColor(grayColor).text("Curated Smart Travel & Itinerary Platform", 54, 62);

            // Status Badge
            const statusText = (itinerary.status || "Planned Trip").toUpperCase();
            doc.roundedRect(40 + contentWidth - 100, 42, 100, 22, 11).fillAndStroke("#FEE2E2", primaryColor);
            doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor).text(statusText, 40 + contentWidth - 100, 48, { width: 100, align: "center" });

            doc.y = 95;

            // =============================================================
            // 2. TRIP HERO BANNER
            // =============================================================
            const bannerY = doc.y;
            const bannerHeight = 72;
            doc.roundedRect(40, bannerY, contentWidth, bannerHeight, 8).fill(darkColor);

            doc.fontSize(16).font("Helvetica-Bold").fillColor("#FFFFFF").text(itinerary.title || `${itinerary.durationDays}-Day Trip to ${itinerary.destinationName}`, 55, bannerY + 12, { width: contentWidth - 30 });
            
            const destSub = itinerary.destinationName ? `${itinerary.destinationName}, India` : "Featured Destination";
            doc.fontSize(10).font("Helvetica").fillColor("#CBD5E1").text(destSub, 55, bannerY + 36);

            // Tags row inside banner
            const tagY = bannerY + 52;
            doc.fontSize(8).font("Helvetica-Bold").fillColor("#FEF08A").text(`${itinerary.durationDays} DAYS`, 55, tagY);
            doc.fillColor("#FFFFFF").text(`  |  ${itinerary.numTravelers} TRAVELERS  |  ${itinerary.budgetTier} BUDGET`, 95, tagY);

            if (itinerary.interests && itinerary.interests.length > 0) {
                doc.fillColor("#93C5FD").text(`  |  Interests: ${itinerary.interests.join(", ")}`, 235, tagY, { width: contentWidth - 245, ellipsis: true });
            }

            doc.y = bannerY + bannerHeight + 16;

            // =============================================================
            // 3. BUDGET SUMMARY & COST BREAKDOWN
            // =============================================================
            const budgetY = doc.y;
            const budgetBoxHeight = 88;
            doc.roundedRect(40, budgetY, contentWidth, budgetBoxHeight, 8).fillAndStroke(lightBg, borderColor);

            // Left side: Grand Total
            doc.fontSize(9).font("Helvetica-Bold").fillColor(primaryColor).text("ESTIMATED TOTAL TRIP COST", 55, budgetY + 12);
            
            const grandTotal = itinerary.costBreakdown?.grandTotal || 0;
            doc.fontSize(18).font("Helvetica-Bold").fillColor(darkColor).text(formatCurrency(grandTotal), 55, budgetY + 26);
            
            const perPerson = Math.round(grandTotal / (itinerary.numTravelers || 1));
            doc.fontSize(8).font("Helvetica").fillColor(grayColor).text(`(${formatCurrency(perPerson)} per traveler)`, 55, budgetY + 48);

            // Divider inside budget card
            doc.strokeColor(borderColor).lineWidth(1).moveTo(210, budgetY + 10).lineTo(210, budgetY + budgetBoxHeight - 10).stroke();

            // Right side: Breakdown columns
            const col1X = 225;
            const col2X = 370;
            const rowSpacing = 14;

            const stayCost = itinerary.costBreakdown?.stayTotal || 0;
            const foodCost = itinerary.costBreakdown?.foodTotal || 0;
            const actCost = itinerary.costBreakdown?.activitiesTotal || 0;
            const entryCost = itinerary.costBreakdown?.entryFeesTotal || 0;
            const transitCost = itinerary.costBreakdown?.estimatedTransportation || 0;

            doc.fontSize(8).font("Helvetica").fillColor(grayColor);
            doc.text("Accommodation:", col1X, budgetY + 14);
            doc.font("Helvetica-Bold").fillColor(darkColor).text(formatCurrency(stayCost), col1X + 80, budgetY + 14);

            doc.font("Helvetica").fillColor(grayColor).text("Meals & Dining:", col1X, budgetY + 14 + rowSpacing);
            doc.font("Helvetica-Bold").fillColor(darkColor).text(formatCurrency(foodCost), col1X + 80, budgetY + 14 + rowSpacing);

            doc.font("Helvetica").fillColor(grayColor).text("Transit (Est.):", col1X, budgetY + 14 + rowSpacing * 2);
            doc.font("Helvetica-Bold").fillColor(darkColor).text(formatCurrency(transitCost), col1X + 80, budgetY + 14 + rowSpacing * 2);

            doc.font("Helvetica").fillColor(grayColor).text("Activities:", col2X, budgetY + 14);
            doc.font("Helvetica-Bold").fillColor(darkColor).text(formatCurrency(actCost), col2X + 75, budgetY + 14);

            doc.font("Helvetica").fillColor(grayColor).text("Entry Fees:", col2X, budgetY + 14 + rowSpacing);
            doc.font("Helvetica-Bold").fillColor(darkColor).text(formatCurrency(entryCost), col2X + 75, budgetY + 14 + rowSpacing);

            doc.y = budgetY + budgetBoxHeight + 16;

            // Trip Notes (if any)
            if (itinerary.customNotes && itinerary.customNotes.trim()) {
                const notesY = doc.y;
                doc.roundedRect(40, notesY, contentWidth, 36, 6).fillAndStroke("#FEF3C7", "#FCD34D");
                doc.fontSize(8).font("Helvetica-Bold").fillColor("#92400E").text("Trip Notes:", 52, notesY + 8);
                doc.fontSize(8).font("Helvetica").fillColor("#78350F").text(itinerary.customNotes, 105, notesY + 8, { width: contentWidth - 120, height: 22, ellipsis: true });
                doc.y = notesY + 44;
            }

            // =============================================================
            // 4. DAY-BY-DAY SCHEDULE
            // =============================================================
            doc.fontSize(12).font("Helvetica-Bold").fillColor(darkColor).text("DAY-BY-DAY ITINERARY SCHEDULE", 40, doc.y);
            doc.strokeColor(primaryColor).lineWidth(1.5).moveTo(40, doc.y + 3).lineTo(120, doc.y + 3).stroke();
            doc.y += 12;

            const days = itinerary.dailyPlan || [];

            days.forEach((day, index) => {
                // Ensure room for day header + weather + at least 1 slot (approx 160pt)
                ensureSpace(160);

                const dayStartY = doc.y;

                // Day Header Bar
                doc.roundedRect(40, dayStartY, contentWidth, 24, 4).fill(darkColor);
                doc.fontSize(10).font("Helvetica-Bold").fillColor("#FFFFFF").text(`DAY ${day.dayNumber}: ${day.morning?.title || 'Exploration'} & ${day.afternoon?.title || 'Sightseeing'}`, 50, dayStartY + 7, { width: contentWidth - 20 });
                doc.y = dayStartY + 28;

                // Day Weather Strip
                const weatherObj = day.weather;
                const hasWeather = weatherObj && (weatherObj.available || weatherObj.temperature !== undefined);

                if (hasWeather) {
                    const weatherY = doc.y;
                    doc.roundedRect(40, weatherY, contentWidth, 24, 4).fillAndStroke("#EFF6FF", "#BFDBFE");
                    
                    const tempText = `${weatherObj.temperature || 20}°C (${weatherObj.condition || 'Clear'})`;
                    const rainText = (weatherObj.rainProbability !== undefined && weatherObj.rainProbability > 0) ? ` | ${weatherObj.rainProbability}% Rain Chance` : "";
                    const tempRange = (weatherObj.tempMin && weatherObj.tempMax) ? ` | Range: ${weatherObj.tempMin}°C - ${weatherObj.tempMax}°C` : "";
                    const suggestionText = weatherObj.suggestion ? ` - ${weatherObj.suggestion}` : "";

                    doc.fontSize(8).font("Helvetica-Bold").fillColor("#1D4ED8").text("WEATHER FORECAST: ", 50, weatherY + 7);
                    doc.font("Helvetica").fillColor("#1E40AF").text(`${tempText}${tempRange}${rainText}${suggestionText}`, 145, weatherY + 7, { width: contentWidth - 155, ellipsis: true });
                    doc.y = weatherY + 28;
                } else {
                    const weatherY = doc.y;
                    doc.roundedRect(40, weatherY, contentWidth, 18, 4).fillAndStroke("#F1F5F9", "#CBD5E1");
                    doc.fontSize(7.5).font("Helvetica").fillColor(grayColor).text("Weather Forecast: Live weather forecast unavailable for this day.", 50, weatherY + 5);
                    doc.y = weatherY + 22;
                }

                // Slots for the Day
                const slots = [
                    {
                        slotName: "MORNING",
                        time: day.morning?.time || "09:00 AM - 12:30 PM",
                        color: morningColor,
                        title: day.morning?.title || "Morning Exploration",
                        description: day.morning?.description,
                        location: day.morning?.location,
                        costInfo: day.morning?.estimatedCost > 0 ? `Entry: ${formatCurrency(day.morning.estimatedCost)}` : "Free Entry"
                    },
                    {
                        slotName: "LUNCH",
                        time: day.lunch?.time || "01:00 PM - 02:30 PM",
                        color: lunchColor,
                        title: day.lunch?.title || "Local Lunch Dining",
                        description: day.lunch?.cuisine ? `Cuisine: ${day.lunch.cuisine}` : null,
                        location: day.lunch?.location,
                        costInfo: day.lunch?.estimatedCost ? `Avg. ${formatCurrency(day.lunch.estimatedCost)}/person` : null
                    },
                    {
                        slotName: "AFTERNOON",
                        time: day.afternoon?.time || "03:00 PM - 05:30 PM",
                        color: afternoonColor,
                        title: day.afternoon?.title || "Afternoon Experience",
                        description: day.afternoon?.description,
                        location: day.afternoon?.location,
                        costInfo: day.afternoon?.estimatedCost ? `Est. Cost: ${formatCurrency(day.afternoon.estimatedCost)}/person` : null
                    },
                    {
                        slotName: "EVENING",
                        time: day.evening?.time || "06:00 PM - 08:00 PM",
                        color: eveningColor,
                        title: day.evening?.title || "Evening Promenade",
                        description: day.evening?.description,
                        location: day.evening?.location,
                        costInfo: day.evening?.estimatedCost > 0 ? `Entry: ${formatCurrency(day.evening.estimatedCost)}` : "Free Access"
                    },
                    {
                        slotName: "DINNER",
                        time: day.dinner?.time || "08:30 PM - 10:00 PM",
                        color: dinnerColor,
                        title: day.dinner?.title || "Dinner & Local Flavors",
                        description: day.dinner?.cuisine ? `Cuisine: ${day.dinner.cuisine}` : null,
                        location: day.dinner?.location,
                        costInfo: day.dinner?.estimatedCost ? `Avg. ${formatCurrency(day.dinner.estimatedCost)}/person` : null
                    },
                    {
                        slotName: "NIGHT STAY",
                        time: "Overnight Accommodation",
                        color: stayColor,
                        title: day.nightStay?.title || "Recommended Hotel / Resort",
                        description: null,
                        location: day.nightStay?.location,
                        costInfo: day.nightStay?.pricePerNight ? `${formatCurrency(day.nightStay.pricePerNight)} / night` : null
                    }
                ];

                slots.forEach(slot => {
                    ensureSpace(42);

                    const slotY = doc.y;
                    // Left color indicator bar
                    doc.rect(40, slotY, 3, 36).fill(slot.color);

                    // Badge / Slot time
                    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(slot.color).text(`${slot.slotName}  •  ${slot.time}`, 48, slotY + 2);

                    // Title
                    doc.fontSize(9).font("Helvetica-Bold").fillColor(darkColor).text(slot.title, 48, slotY + 12, { width: contentWidth - 120, ellipsis: true });

                    // Location & Cost
                    let metaText = slot.location ? slot.location : "";
                    if (slot.costInfo) {
                        metaText = metaText ? `${metaText}  |  ${slot.costInfo}` : slot.costInfo;
                    }
                    if (slot.description && !metaText.includes(slot.description)) {
                        metaText = `${metaText}  |  ${slot.description}`;
                    }

                    if (metaText) {
                        doc.fontSize(7.5).font("Helvetica").fillColor(grayColor).text(metaText, 48, slotY + 24, { width: contentWidth - 20, ellipsis: true });
                    }

                    doc.y = slotY + 38;
                });

                // Spacing after each day
                doc.y += 10;
            });

            // =============================================================
            // 5. FOOTER & PAGE NUMBERING ON ALL PAGES
            // =============================================================
            const range = doc.bufferedPageRange();
            const totalPages = range.count;

            for (let i = 0; i < totalPages; i++) {
                doc.switchToPage(i);
                
                // Draw footer line
                const footerY = doc.page.height - 30;
                doc.strokeColor(borderColor).lineWidth(0.5).moveTo(40, footerY).lineTo(40 + contentWidth, footerY).stroke();

                doc.fontSize(8).font("Helvetica").fillColor(grayColor)
                    .text("Generated by Wanderlust • Explore, Plan, and Experience the World", 40, footerY + 6, { align: "left" });

                doc.fontSize(8).font("Helvetica-Bold").fillColor(darkColor)
                    .text(`Page ${i + 1} of ${totalPages}`, 40, footerY + 6, { align: "right" });
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    generateItineraryPdf,
    sanitizeFilename
};
