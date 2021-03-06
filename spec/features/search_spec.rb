describe "searching", elasticsearch: true do
  it "displays relevant results", :js do
    proposals = populate_proposals
    login_as(proposals.first.requester)

    visit proposals_path
    fill_in "text", with: proposals.first.public_id
    click_button "Search"

    expect(current_path).to eq query_proposals_path
    expect(page).to have_content(proposals.first.public_id)
    expect(page).not_to have_content(proposals.last.name)
  end

  it "gracefully handles ES connection errors", :js do
    proposals = populate_proposals
    login_as(proposals.first.requester)

    visit proposals_path
    es_mock_connection_failed
    fill_in "text", with: proposals.first.name
    click_button "Search"

    expect(current_path).to eq proposals_path
    expect(page).to have_content(I18n.t("errors.features.es.service_unavailable"))
  end

  it "opens advanced search UI when ?search=true set", :js do
    proposals = populate_proposals
    login_as(proposals.first.requester)

    visit proposals_path(search: true)
    fill_in "test_client_request[client_data.amount]", with: proposals.first.client_data.amount
    click_button "adv-search-button"

    expect(current_path).to eq query_proposals_path
    expect(page).to have_content(proposals.first.public_id)
  end

  it "populates the search box on the results page", :js do
    user = create(:user, client_slug: "test")
    login_as(user)

    visit proposals_path
    fill_in "text", with: "foo"
    click_button "Search"

    expect(current_path).to eq("/proposals/query")
    field = find_field("text")
    expect(field.value).to eq("foo")
  end

  it "does not show search UI for user without client_slug" do
    no_client_user = create(:user)
    login_as(no_client_user)

    visit proposals_path
    expect(page).not_to have_button("Search")
  end

  it "contains Download link to CSV", :js do
    proposals = populate_proposals
    login_as(proposals.first.requester)

    visit proposals_path
    fill_in "text", with: proposals.first.name
    click_button "Search"

    expect(page).to have_content("Download")
  end

  describe "Advanced Search" do
    it "provides advanced search", :js do
      proposals = populate_proposals
      login_as(proposals.first.requester)

      visit proposals_path
      fill_in "text", with: proposals.first.name
      fill_in "test_client_request[client_data.amount]", with: proposals.first.client_data.amount
      click_button "adv-search-button"

      expect(current_path).to eq query_proposals_path
      expect(page).to have_content(proposals.first.public_id)
      expect(page).to have_content("(#{proposals.first.name}) AND (Amount:(#{proposals.first.client_data.amount}))")
    end

    it "shows NCR users an Org Code field", :js do
      ncr_user = create(:user, client_slug: "ncr")
      login_as(ncr_user)

      @page = ProposalIndexPage.new
      @page.load
      fill_in "text", with: "blah"

      expect(@page.advanced_search).to have_org_code
    end

    it "shows NCR users Building Number field", :js do
      ncr_user = create(:user, client_slug: "ncr")
      login_as(ncr_user)

      @page = ProposalIndexPage.new
      @page.load
      fill_in "text", with: "blah"

      expect(@page.advanced_search).to have_building_number
    end
  end

  def populate_proposals
    requester = create(:user, client_slug: "test")
    proposals = Array.new(2) do |i|
      wo = create(:test_client_request, project_title: "Work Order #{i}")
      wo.proposal.update(requester: requester)
      wo.proposal.reindex
      wo.proposal
    end
    Proposal.__elasticsearch__.refresh_index!
    proposals
  end
end
