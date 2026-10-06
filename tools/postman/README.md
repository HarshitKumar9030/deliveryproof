# API checks

Import the collection and environment JSON into Postman. Fill credentials in your **local** environment only; do not export/share a populated environment.

1. Run the local API and send Health.
2. Set PayPal sandbox client ID and secret, then send Sandbox OAuth. It stores `access_token` in the environment.
3. Set `project_id`, currency, amount, and a unique `create_request_id`; send Create sandbox order. Keep that request ID for retries of the same operation.
4. Approve the order using a sandbox buyer through a checkout flow before Capture. Use a separate persisted `capture_request_id`.
5. Set a real sandbox `dispute_id` before Read sandbox dispute.

The collection never creates a live payment. The local application exposes no payment HTTP routes yet.
