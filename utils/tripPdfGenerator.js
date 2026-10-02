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
 * Ultra-clean, concise, and structured so a 3-day trip is strictly 1-2 pages without orphan pages.
 * @param {Object} itinerary - Complete populated Itinerary document
 * @returns {Promise<Buffer>} - Resolved PDF buffer
 */
function generateItineraryPdf(itinerary) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                margins: { top: 25, bottom: 25, left: 30, right: 30 },
                bufferPages: true,
                autoFirstPage: true,
                info: {
                    Title: itinerary.title || "Wanderlust Travel Itinerary",
                    Author: "Wanderlust Travel Platform",
                    Subject: `Trip Plan: ${itinerary.fromLocation?.name || 'Origin'} to ${itinerary.destinationName || 'Destination'}`,
                    Keywords: "Travel, Itinerary, Vacation, Wanderlust, Trip Plan"
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
            const travelColor = "#0284C7";  // Blue
            const morningColor = "#D97706"; // Amber
            const lunchColor = "#B45309";   // Warm Orange
            const afternoonColor = "#7C3AED";// Purple
            const eveningColor = "#DC2626"; // Rose/Red
            const dinnerColor = "#1F2937";  // Dark Navy
            const stayColor = "#059669";    // Emerald Green

            const contentWidth = doc.page.width - 60; // 595.28 - 60 = 535.28
            const pageBottomLimit = 740; // Safe height before PDFKit line-wrapper auto-break

            function drawPageHeaderSmall() {
                doc.save();
                doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor).text("WANDERLUST", 30, 15, { continued: true, lineBreak: false });
                doc.font("Helvetica").fillColor(grayColor).text(`  |  ${itinerary.title || "Trip Plan"}`, { lineBreak: false });
                doc.strokeColor(borderColor).lineWidth(0.5).moveTo(30, 24).lineTo(30 + contentWidth, 24).stroke();
                doc.restore();
                doc.y = 28;
            }

            function ensureSpace(heightNeeded) {
                if (doc.y + heightNeeded > pageBottomLimit) {
                    doc.addPage();
                    drawPageHeaderSmall();
                }
            }

            // =============================================================
            // 1. TOP BRANDING BAR
            // =============================================================
            doc.rect(30, 22, 4, 24).fill(primaryColor);
            doc.fontSize(15).font("Helvetica-Bold").fillColor(darkColor).text("WANDERLUST", 40, 22, { lineBreak: false });
            doc.fontSize(7).font("Helvetica").fillColor(grayColor).text("Smart Travel Discovery & Itinerary Platform", 40, 37, { lineBreak: false });

            // Status Badge
            const statusText = (itinerary.status || "Planned Trip").toUpperCase();
            doc.roundedRect(30 + contentWidth - 75, 23, 75, 15, 7.5).fillAndStroke("#FEE2E2", primaryColor);
            doc.fontSize(6.5).font("Helvetica-Bold").fillColor(primaryColor).text(statusText, 30 + contentWidth - 75, 27, { width: 75, align: "center", lineBreak: false });

            doc.y = 50;

            // =============================================================
            // 2. HERO ROUTE BANNER
            // =============================================================
            const bannerY = doc.y;
            const bannerHeight = 48;
            doc.roundedRect(30, bannerY, contentWidth, bannerHeight, 4).fill(darkColor);

            // Title
            doc.fontSize(10.5).font("Helvetica-Bold").fillColor("#FFFFFF").text(itinerary.title || "Wanderlust Travel Itinerary", 40, bannerY + 6, { width: contentWidth - 20, ellipsis: true, lineBreak: false });

            // Route: From -> To
            const fromName = itinerary.fromLocation?.name || "Starting Point";
            const toName = itinerary.destinationName || "Destination";
            doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#38BDF8").text("FROM: ", 40, bannerY + 20, { continued: true, lineBreak: false });
            doc.font("Helvetica").fillColor("#FFFFFF").text(`${fromName}   `, { continued: true, lineBreak: false });
            doc.font("Helvetica-Bold").fillColor("#F87171").text("TO: ", { continued: true, lineBreak: false });
            doc.font("Helvetica").fillColor("#FFFFFF").text(`${toName}`, { width: contentWidth - 20, ellipsis: true, lineBreak: false });

            // Meta tags row
            const transport = itinerary.transportMode || "Car";
            const distanceText = itinerary.travelDistanceKm ? `${itinerary.travelDistanceKm} KM` : "";
            const durationText = itinerary.travelDurationText ? `${itinerary.travelDurationText}` : "";
            const dateSpan = (itinerary.startDate && itinerary.endDate) ? `${itinerary.startDate} - ${itinerary.endDate}` : `${itinerary.durationDays} DAYS`;

            let metaString = `${itinerary.durationDays} DAYS (${dateSpan})  |  ${transport.toUpperCase()}`;
            if (distanceText) metaString += `  |  ${distanceText}`;
            if (durationText) metaString += `  |  EST. TIME: ${durationText.toUpperCase()}`;
            metaString += `  |  ${itinerary.numTravelers} TRAVELERS  |  ${itinerary.budgetTier} BUDGET`;

            doc.fontSize(6.5).font("Helvetica-Bold").fillColor("#FEF08A").text(metaString, 40, bannerY + 33, { width: contentWidth - 20, ellipsis: true, lineBreak: false });

            doc.y = bannerY + bannerHeight + 5;

            // =============================================================
            // 3. BUDGET SUMMARY & COST BREAKDOWN
            // =============================================================
            const budgetY = doc.y;
            const budgetHeight = 48;
            doc.roundedRect(30, budgetY, contentWidth, budgetHeight, 4).fillAndStroke(lightBg, borderColor);

            // Left: Grand Total
            doc.fontSize(6.5).font("Helvetica-Bold").fillColor(primaryColor).text("ESTIMATED TOTAL BUDGET", 40, budgetY + 6, { lineBreak: false });
            const grandTotal = itinerary.costBreakdown?.grandTotal || 0;
            doc.fontSize(12).font("Helvetica-Bold").fillColor(darkColor).text(formatCurrency(grandTotal), 40, budgetY + 15, { lineBreak: false });
            const perPerson = Math.round(grandTotal / (itinerary.numTravelers || 1));
            doc.fontSize(6).font("Helvetica").fillColor(grayColor).text(`(${formatCurrency(perPerson)} per traveler)`, 40, budgetY + 31, { lineBreak: false });

            // Vertical divider
            doc.strokeColor(borderColor).lineWidth(0.5).moveTo(175, budgetY + 4).lineTo(175, budgetY + budgetHeight - 4).stroke();

            // Right: 2-column breakdown
            const col1X = 188;
            const col2X = 350;
            const rowGap = 11;

            const travelCost = itinerary.costBreakdown?.travelCost || 0;
            const localTransit = Math.max(0, (itinerary.costBreakdown?.estimatedTransportation || 0) - travelCost);
            const stayCost = itinerary.costBreakdown?.stayTotal || 0;
            const foodCost = itinerary.costBreakdown?.foodTotal || 0;
            const actCost = itinerary.costBreakdown?.activitiesTotal || 0;
            const entryCost = itinerary.costBreakdown?.entryFeesTotal || 0;

            doc.fontSize(6.5).font("Helvetica").fillColor(grayColor);
            doc.text(`Intercity (${transport}):`, col1X, budgetY + 6, { lineBreak: false });
            doc.font("Helvetica-Bold").fillColor(darkColor).text(formatCurrency(travelCost), col1X + 72, budgetY + 6, { lineBreak: false });

            doc.font("Helvetica").fillColor(grayColor).text("Local Transit:", col1X, budgetY + 6 + rowGap, { lineBreak: false });
            doc.font("Helvetica-Bold").fillColor(darkColor).text(formatCurrency(localTransit), col1X + 72, budgetY + 6 + rowGap, { lineBreak: false });

            doc.font("Helvetica").fillColor(grayColor).text("Accommodation:", col1X, budgetY + 6 + rowGap * 2, { lineBreak: false });
            doc.font("Helvetica-Bold").fillColor(darkColor).text(formatCurrency(stayCost), col1X + 72, budgetY + 6 + rowGap * 2, { lineBreak: false });

            doc.font("Helvetica").fillColor(grayColor).text("Meals & Dining:", col2X, budgetY + 6, { lineBreak: false });
            doc.font("Helvetica-Bold").fillColor(darkColor).text(formatCurrency(foodCost), col2X + 65, budgetY + 6, { lineBreak: false });

            doc.font("Helvetica").fillColor(grayColor).text("Activities:", col2X, budgetY + 6 + rowGap, { lineBreak: false });
            doc.font("Helvetica-Bold").fillColor(darkColor).text(formatCurrency(actCost), col2X + 65, budgetY + 6 + rowGap, { lineBreak: false });

            doc.font("Helvetica").fillColor(grayColor).text("Entry Fees:", col2X, budgetY + 6 + rowGap * 2, { lineBreak: false });
            doc.font("Helvetica-Bold").fillColor(darkColor).text(formatCurrency(entryCost), col2X + 65, budgetY + 6 + rowGap * 2, { lineBreak: false });

            doc.y = budgetY + budgetHeight + 5;

            // Optional Notes
            if (itinerary.customNotes && itinerary.customNotes.trim()) {
                const notesY = doc.y;
                doc.roundedRect(30, notesY, contentWidth, 18, 3).fillAndStroke("#FEF3C7", "#FCD34D");
                doc.fontSize(6).font("Helvetica-Bold").fillColor("#92400E").text("Trip Notes: ", 38, notesY + 5, { continued: true, lineBreak: false });
                doc.font("Helvetica").fillColor("#78350F").text(itinerary.customNotes.trim(), { width: contentWidth - 16, ellipsis: true, lineBreak: false });
                doc.y = notesY + 22;
            }

            // =============================================================
            // 4. DAY-BY-DAY SCHEDULE
            // =============================================================
            doc.fontSize(8.5).font("Helvetica-Bold").fillColor(darkColor).text("DAY-BY-DAY ITINERARY SCHEDULE", 30, doc.y, { lineBreak: false });
            doc.strokeColor(primaryColor).lineWidth(1).moveTo(30, doc.y + 11).lineTo(105, doc.y + 11).stroke();
            doc.y += 15;

            const days = itinerary.dailyPlan || [];

            days.forEach((day) => {
                const dayBlockHeight = 140;
                ensureSpace(dayBlockHeight);

                const dayStartY = doc.y;

                // Day Header Bar
                doc.roundedRect(30, dayStartY, contentWidth, 15, 3).fill(darkColor);
                const dayHeaderTitle = day.dayNumber === 1 
                    ? `DAY 1: ${fromName.split(',')[0]} to ${toName} Travel & Welcome`
                    : `DAY ${day.dayNumber}: ${day.morning?.title || 'Exploration'} & ${day.afternoon?.title || 'Sightseeing'}`;
                
                doc.fontSize(7).font("Helvetica-Bold").fillColor("#FFFFFF").text(dayHeaderTitle, 38, dayStartY + 3.5, { width: contentWidth - 16, ellipsis: true, lineBreak: false });
                doc.y = dayStartY + 17;

                // Weather strip
                const weatherObj = day.weather;
                const hasWeather = weatherObj && (weatherObj.available || weatherObj.temperature !== undefined);

                if (hasWeather) {
                    const weatherY = doc.y;
                    doc.roundedRect(30, weatherY, contentWidth, 13, 2).fillAndStroke("#EFF6FF", "#BFDBFE");
                    
                    const tempText = `${weatherObj.temperature || 20}°C (${weatherObj.condition || 'Clear'})`;
                    const rainText = (weatherObj.rainProbability !== undefined && weatherObj.rainProbability > 0) ? ` | ${weatherObj.rainProbability}% Rain` : "";
                    const tempRange = (weatherObj.tempMin && weatherObj.tempMax) ? ` | Range: ${weatherObj.tempMin}°C - ${weatherObj.tempMax}°C` : "";
                    const suggestionText = weatherObj.suggestion ? ` - ${weatherObj.suggestion}` : "";

                    doc.fontSize(5.8).font("Helvetica-Bold").fillColor("#1D4ED8").text("DESTINATION FORECAST: ", 38, weatherY + 2.5, { continued: true, lineBreak: false });
                    doc.font("Helvetica").fillColor("#1E40AF").text(`${tempText}${tempRange}${rainText}${suggestionText}`, { width: contentWidth - 16, ellipsis: true, lineBreak: false });
                    doc.y = weatherY + 15;
                }

                // 6 Slots for the Day
                const slots = [
                    {
                        slotName: day.dayNumber === 1 ? "JOURNEY" : "MORNING",
                        time: day.morning?.time || "09:00 AM - 12:30 PM",
                        color: day.dayNumber === 1 ? travelColor : morningColor,
                        title: day.morning?.title || "Morning Exploration",
                        description: day.morning?.description,
                        location: day.morning?.location,
                        costInfo: day.morning?.estimatedCost > 0 ? `Entry: ${formatCurrency(day.morning.estimatedCost)}` : (day.dayNumber === 1 ? `Transport: ${transport}` : "Free Entry")
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

                slots.forEach((slot) => {
                    const slotY = doc.y;
                    const slotHeight = 17;

                    // Left color bar
                    doc.rect(30, slotY, 2, slotHeight - 1).fill(slot.color);

                    // Row 1: Badge + Title
                    doc.fontSize(5.8).font("Helvetica-Bold").fillColor(slot.color).text(`${slot.slotName} (${slot.time})`, 36, slotY + 1.2, { continued: true, lineBreak: false });
                    doc.font("Helvetica-Bold").fillColor(darkColor).text(`  •  ${slot.title}`, { width: contentWidth - 10, ellipsis: true, lineBreak: false });

                    // Row 2: Location & Cost metadata
                    let metaText = slot.location ? slot.location : "";
                    if (slot.costInfo) {
                        metaText = metaText ? `${metaText}  |  ${slot.costInfo}` : slot.costInfo;
                    }
                    if (slot.description && !metaText.includes(slot.description)) {
                        metaText = `${metaText}  |  ${slot.description}`;
                    }

                    if (metaText) {
                        doc.fontSize(5.8).font("Helvetica").fillColor(grayColor).text(metaText, 36, slotY + 8.8, { width: contentWidth - 10, ellipsis: true, lineBreak: false });
                    }

                    doc.y = slotY + slotHeight;
                });

                doc.y += 4; // Spacing after each day
            });

            // =============================================================
            // 5. FOOTER & PAGE NUMBERING ON ALL PAGES
            // =============================================================
            const range = doc.bufferedPageRange();
            const totalPages = range.count;

            for (let i = 0; i < totalPages; i++) {
                doc.switchToPage(i);
                
                const footerY = doc.page.height - 18;
                doc.strokeColor(borderColor).lineWidth(0.5).moveTo(30, footerY).lineTo(30 + contentWidth, footerY).stroke();

                doc.fontSize(6).font("Helvetica").fillColor(grayColor)
                    .text("Generated by Wanderlust • Explore, Plan, and Experience the World", 30, footerY + 3, { align: "left", lineBreak: false });

                doc.fontSize(6).font("Helvetica-Bold").fillColor(darkColor)
                    .text(`Page ${i + 1} of ${totalPages}`, 30, footerY + 3, { align: "right", lineBreak: false });
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
