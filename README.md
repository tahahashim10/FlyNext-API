# FlyNext-API

FlyNext-API is the backend server for the FlyNext travel search platform. It provides RESTful endpoints for flight and hotel searches, bookings, invoices, and notifications. The server is built using Next.js (App Router), Prisma, and integrates with the Advanced Flights System (AFS) API.

## Features
- **User Management**: Registration, login, profile updates.
- **Flight Search & Booking**: Search flights using the AFS API and book flight itineraries.
- **Hotel Management & Booking**: Create hotels, define room types, and manage hotel reservations.
- **Combined Itineraries**: Book itineraries that include both flight and hotel reservations.
- **Checkout & Invoicing**: Validate credit card details for checkout and generate PDF invoices.
- **Notifications**: Send notifications for booking events and updates.

## Setup
1. **Clone the repository:**
   ```bash
   git clone https://github.com/tahahashim10/FlyNext-API
   cd FlyNext-API
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory with variables like:
   ```
   DATABASE_URL=your_db_url
   JWT_SECRET=your_jwt_secret
   AFS_BASE_URL=https://advanced-flights-system.replit.app
   AFS_API_KEY=your_afs_api_key
   ```

4. **Migrate and seed the database:**
   ```bash
   npx prisma migrate dev --name init
   npm run startup  # or run your startup.sh script which installs deps, runs migrations, and seeds cities and airports
   ```

5. **Run the server:**
   ```bash
   npm run dev
   ```
   The API will be available at [http://localhost:3000](http://localhost:3000).

## API Documentation
- **Swagger/OpenAPI**: See `collection.openapi` for detailed API documentation.
- **Postman Collection**: See `postman_collection.json` for testing the endpoints.

## Project Structure
- **/app/api/**: Contains route handlers for endpoints (users, hotels, flights, bookings, notifications, etc.).
- **/utils/**: Utility functions including authentication (`auth.js`), database queries, flight utilities, PDF generation, and more.
- **Prisma Schema**: Located in `prisma/schema.prisma`; defines models for User, Hotel, Room, Booking, FlightBooking, Notification, City, and Airport.
- **Startup & Run Scripts**: `startup.sh` sets up your environment and seeds data; `run.sh` launches the server.

## Testing
To test the endpoints, use the provided Postman collection or your preferred API testing tool. Ensure you have a valid JWT by registering and logging in before accessing protected endpoints.
