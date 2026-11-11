import { describe, it, expect } from "vitest";    // test tools
import { validateBooking } from "./bookings.js";  // the code under test
import { MESSAGES } from "../domain/validation.js"; // Error-Messages

function getValidShowtime() {
  return { id: 1, auditorium_id: 7 };
}
function getValidSeat() {
  return { id: 3, auditorium_id: 7 };
}
function getValidBooking(overrides = {}) {
  const def = { qr_code_token: "abc-123", total_price: 15, payment_method: "twint" };
  return {...def, ...overrides};
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

  it("adds an error when the seat is already taken", () => {
    // Arrange: prepare the input
    const showtime = getValidShowtime();
    const seat = getValidSeat();
    const booking = getValidBooking();

    //Act
    const errors = validateBooking(booking, {seat, showtime, seatTaken: true});
    //Assert
    expect(errors.on("seat_id")).toEqual(["ist für diese Vorstellung bereits gebucht"]);
    expect(errors.attributeNames).toEqual(["seat_id"]);
    expect(errors.fullMessages()).toEqual(["Sitzplatz ist für diese Vorstellung bereits gebucht"]);
  });

  it("adds an error when the qr-code-token is missing", () => {
    // Arrange: prepare the input
    const showtime = getValidShowtime();
    const seat = getValidSeat();
    const booking = getValidBooking({qr_code_token: null});
    
    // Act: call the function
    const errors = validateBooking(booking, { seat, showtime });

    expect(errors.on("qr_code_token")).toEqual([MESSAGES.blank]);
    expect(errors.attributeNames).toEqual(["qr_code_token"]);
  });

  it("adds an error when the token is already taken", () => {
    // Arrange: prepare the input
    const showtime = getValidShowtime();
    const seat = getValidSeat();
    const booking = getValidBooking();

    //Act
    const errors = validateBooking(booking, {seat, showtime, tokenTaken: true});

    //Assert
    expect(errors.on("qr_code_token")).toEqual([MESSAGES.taken]);
    expect(errors.attributeNames).toEqual(["qr_code_token"]);
  });


  it("adds an error when the total_price is missing", () => {
    // Arrange: prepare the input
    const showtime = getValidShowtime();
    const seat = getValidSeat();
    const booking = getValidBooking({total_price: null});
    
    // Act: call the function
    const errors = validateBooking(booking, { seat, showtime });

    expect(errors.on("total_price")).toEqual([MESSAGES.blank, MESSAGES.notANumber]);
    expect(errors.attributeNames).toEqual(["total_price"]);
  });

  
  it("adds an error when the price is lower than 0", () => {
    // Arrange: prepare the input
    const showtime = getValidShowtime();
    const seat = getValidSeat();
    const booking = getValidBooking({total_price: -1});

    //Act
    const errors = validateBooking(booking, {seat, showtime});
    //Assert
    expect(errors.on("total_price")).toEqual([MESSAGES.greaterThanOrEqualTo(0)]);
    expect(errors.attributeNames).toEqual(["total_price"]);
  });


  it("returns no errors on undefined payment_method", () => {
    // Arrange: prepare the input
    const showtime = getValidShowtime();
    const seat = getValidSeat();
    const booking = getValidBooking({payment_method: undefined});

    //Act
    const errors = validateBooking(booking, {seat, showtime});

    //Assert
    expect(errors.any).toBe(false);
  });

  it("returns no errors on null payment_method", () => {
    // Arrange: prepare the input
    const showtime = getValidShowtime();
    const seat = getValidSeat();
    const booking = getValidBooking({payment_method: null});

    //Act
    const errors = validateBooking(booking, {seat, showtime});

    //Assert
    expect(errors.any).toBe(false);
  });

  it("adds an error when the payment method is unacceptable", () => {
    // Arrange: prepare the input
    const showtime = getValidShowtime();
    const seat = getValidSeat();
    const booking = getValidBooking({payment_method: "naturoi"});

    //Act
    const errors = validateBooking(booking, {seat, showtime});

    //Assert
    expect(errors.on("payment_method")).toEqual(["ist keine gültige Zahlungsmethode"]);
    expect(errors.attributeNames).toEqual(["payment_method"]);
  });
});