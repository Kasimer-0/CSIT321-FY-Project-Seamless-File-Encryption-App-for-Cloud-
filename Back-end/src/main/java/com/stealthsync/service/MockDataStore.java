package com.stealthsync.service;

import com.stealthsync.model.dto.CreateTicketRequest;
import com.stealthsync.model.dto.DashboardStatsResponse;
import com.stealthsync.model.dto.UserAccountDTO;
import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.model.entity.EncryptedFileRecord;
import com.stealthsync.model.entity.Plan;
import com.stealthsync.model.entity.Subscription;
import com.stealthsync.model.entity.Ticket;
import com.stealthsync.model.entity.UserAccount;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
public class MockDataStore {

    private static final Long DEFAULT_CUSTOMER_ID = 2L;

    private final List<UserAccount> users = new ArrayList<>();
    private final List<Plan> plans = new ArrayList<>();
    private final List<Ticket> tickets = new ArrayList<>();
    private final List<Subscription> subscriptions = new ArrayList<>();
    private final List<CloudStorageLink> cloudStorageLinks = new ArrayList<>();
    private final List<EncryptedFileRecord> encryptedFiles = new ArrayList<>();

    private final AtomicLong userIdSequence = new AtomicLong(3);
    private final AtomicLong planIdSequence = new AtomicLong(3);
    private final AtomicLong ticketIdSequence = new AtomicLong(3);
    private final AtomicLong subscriptionIdSequence = new AtomicLong(2);
    private final AtomicLong cloudLinkIdSequence = new AtomicLong(3);
    private final AtomicLong fileIdSequence = new AtomicLong(2);

    public MockDataStore() {
        Plan freePlan = new Plan(1L, "Basic Free Tier", 0.0, "AES-128 Client-side Silent Encryption", "active", "AES-128");
        Plan premiumPlan = new Plan(2L, "Premium Corporate Tier", 15.0, "AES-256 GCM Stream Encryption with Hardware Token Support", "active", "AES-256-GCM");
        plans.add(freePlan);
        plans.add(premiumPlan);

        UserAccount admin = new UserAccount(1L, "admin", "admin@stealthsync.com", "admin", true, false, null);
        UserAccount customer = new UserAccount(2L, "PremiumUser", "user@stealthsync.com", "customer", true, false, 1L);
        users.add(admin);
        users.add(customer);

        subscriptions.add(new Subscription(
                1L,
                premiumPlan,
                customer,
                "active",
                LocalDate.now().minusDays(20),
                LocalDate.now().plusDays(10)
        ));

        tickets.add(new Ticket(
                1L,
                "Cannot decrypt uploaded file",
                "User reports that decryption fails after downloading an encrypted cloud backup.",
                "open",
                customer,
                null
        ));
        tickets.add(new Ticket(
                2L,
                "Plan upgrade question",
                "Customer wants to confirm whether AES-256-GCM is included in the premium plan.",
                "open",
                customer,
                admin
        ));

        cloudStorageLinks.add(new CloudStorageLink(
                1L,
                "google_drive",
                "premium.user@gmail.com",
                Instant.now().minusSeconds(86400 * 7),
                "connected",
                true,
                DEFAULT_CUSTOMER_ID
        ));
        cloudStorageLinks.add(new CloudStorageLink(
                2L,
                "dropbox",
                "premium.user@dropbox.example",
                Instant.now().minusSeconds(86400 * 3),
                "expired",
                false,
                DEFAULT_CUSTOMER_ID
        ));

        encryptedFiles.add(new EncryptedFileRecord(
                1L,
                "sample-contract.pdf",
                245760,
                "pdf",
                Instant.now().minusSeconds(3600),
                "AES-256-GCM",
                1001L,
                new byte[0]
        ));
    }

    public Optional<UserAccount> authenticate(String usernameOrEmail, String password) {
        if (("admin".equalsIgnoreCase(usernameOrEmail)
                || "admin@stealthsync.com".equalsIgnoreCase(usernameOrEmail))
                && "Admin@123".equals(password)) {
            return findUser(1L);
        }
        if (("PremiumUser".equalsIgnoreCase(usernameOrEmail)
                || "user@stealthsync.com".equalsIgnoreCase(usernameOrEmail))
                && "User@1234".equals(password)) {
            return findUser(DEFAULT_CUSTOMER_ID);
        }
        return Optional.empty();
    }

    public UserAccount registerCustomer(String username, String email) {
        UserAccount user = new UserAccount(userIdSequence.getAndIncrement(), username, email, "customer", false, false, null);
        users.add(user);
        return user;
    }

    public DashboardStatsResponse dashboardStats() {
        return DashboardStatsResponse.builder()
                .totalUsers(users.size())
                .premiumUsers((int) users.stream().filter(UserAccount::isSubscribed).count())
                .inactiveUsers((int) users.stream().filter(UserAccount::isSuspended).count())
                .openTickets((int) tickets.stream().filter(ticket -> "open".equalsIgnoreCase(ticket.getTicketStatus())).count())
                .build();
    }

    public List<UserAccountDTO> listUsers(String search) {
        String keyword = normalize(search);
        return users.stream()
                .filter(user -> keyword.isBlank()
                        || user.getUsername().toLowerCase(Locale.ROOT).contains(keyword)
                        || user.getEmail().toLowerCase(Locale.ROOT).contains(keyword))
                .map(this::toUserAccountDTO)
                .collect(Collectors.toList());
    }

    public Optional<UserAccount> findUser(Long userID) {
        return users.stream()
                .filter(user -> user.getUserID().equals(userID))
                .findFirst();
    }

    public Optional<UserAccountDTO> updateUserProfile(Long userID, String username, String email) {
        return findUser(userID).map(user -> {
            if (username != null && !username.isBlank()) {
                user.setUsername(username);
            }
            if (email != null && !email.isBlank()) {
                user.setEmail(email);
            }
            return toUserAccountDTO(user);
        });
    }

    public Optional<UserAccountDTO> setUserSuspended(Long userID, boolean suspended) {
        return findUser(userID).map(user -> {
            user.setSuspended(suspended);
            return toUserAccountDTO(user);
        });
    }

    public List<Plan> listPlans() {
        return plans;
    }

    public Plan createPlan(Plan plan) {
        plan.setPlanID(planIdSequence.getAndIncrement());
        if (plan.getPlanStatus() == null || plan.getPlanStatus().isBlank()) {
            plan.setPlanStatus("active");
        }
        plans.add(plan);
        return plan;
    }

    public Optional<Plan> updatePlan(Long planID, Plan updatedPlan) {
        return findPlan(planID).map(existing -> {
            existing.setPlanTitle(updatedPlan.getPlanTitle());
            existing.setPlanPrice(updatedPlan.getPlanPrice());
            existing.setPlanDescription(updatedPlan.getPlanDescription());
            existing.setPlanStatus(updatedPlan.getPlanStatus());
            existing.setEncMethod(updatedPlan.getEncMethod());
            return existing;
        });
    }

    public Optional<Plan> updatePlanStatus(Long planID, String status) {
        return findPlan(planID).map(plan -> {
            plan.setPlanStatus(status);
            return plan;
        });
    }

    public Optional<Plan> findPlan(Long planID) {
        return plans.stream()
                .filter(plan -> plan.getPlanID().equals(planID))
                .findFirst();
    }

    public List<Ticket> listTickets(String search, String status, String personInCharge, String requester) {
        String keyword = normalize(search);
        return tickets.stream()
                .filter(ticket -> keyword.isBlank()
                        || ticket.getTicketTitle().toLowerCase(Locale.ROOT).contains(keyword)
                        || ticket.getTicketDescription().toLowerCase(Locale.ROOT).contains(keyword))
                .filter(ticket -> status == null || status.isBlank() || ticket.getTicketStatus().equalsIgnoreCase(status))
                .filter(ticket -> requester == null || requester.isBlank()
                        || ticket.getTicketRequester().getUserID().toString().equals(requester))
                .filter(ticket -> personInCharge == null || personInCharge.isBlank()
                        || ("unassigned".equals(personInCharge) && ticket.getPersonInCharge() == null)
                        || (ticket.getPersonInCharge() != null
                        && ticket.getPersonInCharge().getUserID().toString().equals(personInCharge)))
                .collect(Collectors.toList());
    }

    public List<Ticket> listMyTickets() {
        return tickets.stream()
                .filter(ticket -> ticket.getTicketRequester().getUserID().equals(DEFAULT_CUSTOMER_ID))
                .collect(Collectors.toList());
    }

    public Ticket createTicket(CreateTicketRequest request) {
        UserAccount requester = findUser(request.getTicketRequesterID()).orElseGet(() -> findUser(DEFAULT_CUSTOMER_ID).orElseThrow());
        Ticket ticket = new Ticket(
                ticketIdSequence.getAndIncrement(),
                request.getTicketTitle(),
                request.getTicketDescription(),
                "open",
                requester,
                null
        );
        tickets.add(ticket);
        return ticket;
    }

    public Optional<Ticket> assignTicket(Long ticketID, Long personInChargeID) {
        UserAccount assignee = findUser(personInChargeID)
                .orElseGet(() -> new UserAccount(personInChargeID, "AdminUser", "admin.user@stealthsync.com", "admin", true, false));
        return findTicket(ticketID).map(ticket -> {
            ticket.setPersonInCharge(assignee);
            return ticket;
        });
    }

    public Optional<Ticket> closeTicket(Long ticketID) {
        return findTicket(ticketID).map(ticket -> {
            ticket.setTicketStatus("closed");
            return ticket;
        });
    }

    public List<Subscription> listSubscriptions(String search) {
        String keyword = normalize(search);
        return subscriptions.stream()
                .filter(subscription -> keyword.isBlank()
                        || subscription.getSubscriber().getUsername().toLowerCase(Locale.ROOT).contains(keyword)
                        || subscription.getSubscriber().getEmail().toLowerCase(Locale.ROOT).contains(keyword)
                        || subscription.getPlan().getPlanTitle().toLowerCase(Locale.ROOT).contains(keyword))
                .collect(Collectors.toList());
    }

    public Optional<Subscription> findSubscription(Long subscriptionID) {
        return subscriptions.stream()
                .filter(subscription -> subscription.getSubscriptionID().equals(subscriptionID))
                .findFirst();
    }

    public Optional<Subscription> cancelSubscription(Long subscriptionID) {
        return findSubscription(subscriptionID).map(subscription -> {
            subscription.setSubcriptionStatus("cancelled");
            UserAccount subscriber = subscription.getSubscriber();
            subscriber.setSubscribed(false);
            subscriber.setSubscription(null);
            return subscription;
        });
    }

    public Optional<Subscription> updateSubscription(Long subscriptionID, Subscription updated) {
        return findSubscription(subscriptionID).map(existing -> {
            Long planID = updated.getPlan() == null ? null : updated.getPlan().getPlanID();
            findPlan(planID).ifPresent(existing::setPlan);
            existing.setSubcriptionStatus(updated.getSubcriptionStatus());
            existing.setSubcriptionStartDate(updated.getSubcriptionStartDate());
            existing.setSubscriptionEndDate(updated.getSubscriptionEndDate());
            boolean active = "active".equalsIgnoreCase(existing.getSubcriptionStatus());
            existing.getSubscriber().setSubscribed(active);
            existing.getSubscriber().setSubscription(active ? existing.getSubscriptionID() : null);
            return existing;
        });
    }

    public List<CloudStorageLink> listCloudStorageLinks() {
        return cloudStorageLinks;
    }

    public Optional<CloudStorageLink> setActiveCloudStorageLink(Long linkID) {
        Optional<CloudStorageLink> selected = findCloudStorageLink(linkID);
        selected.ifPresent(link -> cloudStorageLinks.forEach(existing -> existing.setActive(existing.getLinkID().equals(linkID))));
        return selected;
    }

    public boolean removeCloudStorageLink(Long linkID) {
        return cloudStorageLinks.removeIf(link -> link.getLinkID().equals(linkID));
    }

    public Optional<CloudStorageLink> reconnectCloudStorageLink(Long linkID) {
        return findCloudStorageLink(linkID).map(link -> {
            link.setStatus("connected");
            link.setLinkedAt(Instant.now());
            return link;
        });
    }

    public CloudStorageLink linkCloudProvider(String provider) {
        Optional<CloudStorageLink> existing = cloudStorageLinks.stream()
                .filter(link -> link.getProvider().equals(provider))
                .findFirst();
        if (existing.isPresent()) {
            CloudStorageLink link = existing.get();
            link.setStatus("connected");
            link.setLinkedAt(Instant.now());
            return link;
        }

        boolean firstLink = cloudStorageLinks.isEmpty();
        CloudStorageLink link = new CloudStorageLink(
                cloudLinkIdSequence.getAndIncrement(),
                provider,
                provider.replace("_", ".") + ".user@example.com",
                Instant.now(),
                "connected",
                firstLink,
                DEFAULT_CUSTOMER_ID
        );
        cloudStorageLinks.add(link);
        return link;
    }

    public List<EncryptedFileRecord> listEncryptedFiles() {
        return encryptedFiles;
    }

    public EncryptedFileRecord storeEncryptedFile(String filename, long originalSize, String encMethod, byte[] encryptedContent) {
        EncryptedFileRecord record = new EncryptedFileRecord(
                fileIdSequence.getAndIncrement(),
                filename,
                originalSize,
                fileType(filename),
                Instant.now(),
                encMethod,
                1000L + fileIdSequence.get(),
                encryptedContent
        );
        encryptedFiles.add(record);
        return record;
    }

    public Optional<EncryptedFileRecord> findEncryptedFile(Long fileID) {
        return encryptedFiles.stream()
                .filter(file -> file.getFileID().equals(fileID))
                .findFirst();
    }

    private Optional<Ticket> findTicket(Long ticketID) {
        return tickets.stream()
                .filter(ticket -> ticket.getTicketID().equals(ticketID))
                .findFirst();
    }

    private Optional<CloudStorageLink> findCloudStorageLink(Long linkID) {
        return cloudStorageLinks.stream()
                .filter(link -> link.getLinkID().equals(linkID))
                .findFirst();
    }

    private UserAccountDTO toUserAccountDTO(UserAccount user) {
        UserAccountDTO dto = new UserAccountDTO();
        dto.setUserID(user.getUserID());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
        dto.setSubscribed(user.isSubscribed());
        dto.setSuspended(user.isSuspended());
        if (user.getSubscription() == null) {
            dto.setSubscription(null);
        } else {
            findSubscription(user.getSubscription()).ifPresent(dto::setSubscription);
        }
        return dto;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String fileType(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "file";
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }
}
