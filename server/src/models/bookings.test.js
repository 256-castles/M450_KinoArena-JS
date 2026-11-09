import { describe, it, expect } from "vitest";    // test tools
import { validateBooking } from "./bookings.js";  // the code under test
import { MESSAGES } from "../domain/validation.js"; // Error-Messages

function getValidShowtime() {
  return { id: 1, auditorium_id: 7 };
}
function getValidSeat() {
  return { id: 3, auditorium_id: 7 };
}
function getValidBooking() {
  return { qr_code_token: "abc-123", total_price: 15, payment_method: "twint" };
}

describe("validateBooking", () => {                     // group of tests
  it("returns no errors for a valid booking", () => {   // one test case
    // Arrange: prepare the input
    const showtime = getValidShowtime();
    const seat = getValidSeat();
    const booking = getValidBooking();
    
    // Act: call the function
    const errors = validateBooking(booking, { seat, showtime });
    
    // Assert: check the result
    expect(errors.any).toBe(false);
  });

  it("adds an error when the showtime is missing", () => {
    // Arrange:
    const showtime = null;
    const seat = getValidSeat();
    const booking = getValidBooking();
    // Act:
    const errors = validateBooking(booking, { seat, showtime });
    // Assert:
    expect(errors.on("showtime")).toEqual([MESSAGES.blank]);
    expect(errors.attributeNames).toEqual(["showtime"]); // checks if it has only "showtime" error
  });

  it("adds an error when the seat is missing", () => {
    //Arrange
    const showtime = getValidShowtime();
    const seat = null;
    const booking = getValidBooking();
    //Act
    const errors = validateBooking(booking, {seat, showtime});
    //Assert
    expect(errors.on("seat")).toEqual([MESSAGES.blank]);
    expect(errors.attributeNames).toEqual(["seat"]);
  });

});