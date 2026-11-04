import { describe, it, expect } from "vitest";    // ① test tools
import { validateBooking } from "./bookings.js";  // ② the code under test
import { MESSAGES } from "../domain/validation.js"; // Error-Messages

describe("validateBooking", () => {               // ③ group of tests
  it("returns no errors for a valid booking", () => {   // ④ one test case
    // Arrange: prepare the input
    const showtime = { id: 1, auditorium_id: 7 };
    const seat = { id: 3, auditorium_id: 7 };
    const booking = { qr_code_token: "abc-123", total_price: 15, payment_method: "twint" };
    
    // Act: call the function
    const errors = validateBooking(booking, { seat, showtime });
    
    // Assert: check the result
    expect(errors.any).toBe(false);
});

it("adds an error when the showtime is missing", () => {
    // Arrange:
    const showtime = null;
    const seat = { id: 3, auditorium_id: 7 };
    const booking = { qr_code_token: "abc-123", total_price: 15, payment_method: "twint" };
    // Act:
     const errors = validateBooking(booking, { seat, showtime });
    // Assert:
    expect(errors.on("showtime")).toEqual([MESSAGES.blank]);
  });
});