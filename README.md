# عقارك بنفسك Platform

Act as an expert Senior Full-Stack Developer and Software Architect. I need you to build a cross-platform Real Estate Platform for the Egyptian market named "عقارك بنفسك". The architecture must be highly modular, clean, and well-documented so that components and filters can be easily modified later without rewriting the core codebase.

 

Please start by setting up the project shell and database layer for Phase 1 with the following specifications:

 

1. Target Platforms: Web interface and highly responsive Mobile preview layouts.

2. User Roles: Individuals (regular buyers/sellers) and Real Estate Agencies.

3. Core Feature - Dual-Market Tabs:

   - Tab 1: "Offered Properties" (Supply/العرض) - For owners listing properties.

   - Tab 2: "Search Requests" (Demand/الطلب) - For buyers looking for properties.

4. Core Feature - Advanced Egyptian Location Filter:

   - Implement a dynamic hierarchical dropdown system strictly based on the Egyptian Administrative Division: Governorate (المحافظة) -> City/District (المركز / المدينة / الحي).

   - Please hardcode a complete list of all 27 Egyptian Governorates. 

   - For preview testing, pre-populate real dynamic districts for: Cairo (القاهرة), Giza (الجيزة), Alexandria (الإسكندرية), and Dakahlia (الدقهلية). For all other governorates, show a dynamic placeholder like "Select City/District" and ensure the validation rule allows unlocking the "Next" button in the posting flow once selected.

 

Please build this foundational layer first, set up the database schema, and show me the preview before we move to payments and chat.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://offer-demand-egypt.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/20f61e1b-4592-45d4-86e2-9aed348b44d1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
