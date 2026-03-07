import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:3000
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        
        # -> Type the provided conversation into the main conversation input area (textarea at index 5).
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/main/div[2]/div/div[2]/div/textarea').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Customer: Hola, necesito ayuda con mi entrega. Agent: Claro. Customer: No llegó y estoy preocupado. Agent: Revisaré el estado.')
        
        # -> Click the 'Analyze' button to run the analysis and then verify the presence of 'Intent', 'Translation', 'Cultural', and the 'translation' element.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div[2]/div/div[3]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Intent').first).to_be_visible(timeout=3000)
        await expect(frame.locator('text=Translation').first).to_be_visible(timeout=3000)
        await expect(frame.locator('text=Cultural').first).to_be_visible(timeout=3000)
        await expect(frame.locator('xpath=//*[@id=\"translation\"]').first).to_be_visible(timeout=3000)
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    